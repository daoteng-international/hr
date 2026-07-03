"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, Empty, ErrorText, PrimaryButton } from "@/components/admin-ui";
import {
  getEmployees,
  getSalaryStructure,
  putSalaryStructure,
  runPayroll,
  getPayslips,
  finalizePayslip,
  getNhiDependents,
  addNhiDependent,
  deleteNhiDependent,
  getTaxDependents,
  addTaxDependent,
  deleteTaxDependent,
  type Employee,
  type Payslip,
  type NhiDependent,
  type TaxDependent,
} from "@/lib/admin-api";

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

export default function PayrollAdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 員工薪資保險資料
  const [empId, setEmpId] = useState("");
  const [method, setMethod] = useState<"monthly" | "by_attendance_days">("monthly");
  const [baseSalary, setBaseSalary] = useState("");
  const [hourlyWage, setHourlyWage] = useState("");
  const [salaryMsg, setSalaryMsg] = useState<string | null>(null);
  const [nhiDeps, setNhiDeps] = useState<NhiDependent[]>([]);
  const [taxDeps, setTaxDeps] = useState<TaxDependent[]>([]);

  // 執行薪資作業 + 查詢/列印
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [runPeriod, setRunPeriod] = useState(currentPeriod);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [listPeriod, setListPeriod] = useState(currentPeriod);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  useEffect(() => {
    getEmployees()
      .then((r) => setEmployees(r.employees))
      .catch((err) => setError(err instanceof Error ? err.message : "載入員工失敗"));
  }, []);

  const loadEmployee = useCallback(async (id: string) => {
    setSalaryMsg(null);
    setNhiDeps([]);
    setTaxDeps([]);
    if (!id) return;
    // Structure may 404 for a new employee — treat as blank.
    try {
      const { salary } = await getSalaryStructure(id);
      setMethod(salary.method);
      setBaseSalary(salary.base_salary ?? "");
      setHourlyWage(salary.hourly_wage ?? "");
    } catch {
      setMethod("monthly");
      setBaseSalary("");
      setHourlyWage("");
    }
    try {
      const [nhi, tax] = await Promise.all([getNhiDependents(id), getTaxDependents(id)]);
      setNhiDeps(nhi["nhi-dependents"]);
      setTaxDeps(tax["income-tax-dependents"]);
    } catch {
      /* dependents lists are best-effort */
    }
  }, []);

  useEffect(() => {
    void loadEmployee(empId);
  }, [empId, loadEmployee]);

  async function onSaveSalary(e: FormEvent) {
    e.preventDefault();
    if (!empId) return;
    setSalaryMsg(null);
    try {
      await putSalaryStructure(empId, {
        method,
        baseSalary: baseSalary ? Number(baseSalary) : null,
        hourlyWage: hourlyWage ? Number(hourlyWage) : 0,
      });
      setSalaryMsg("已儲存");
    } catch (err) {
      setSalaryMsg(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  async function onAddNhi() {
    if (!empId) return;
    const name = prompt("眷屬姓名？");
    if (!name) return;
    const relationship = prompt("關係？（配偶/子女/父母…）") ?? undefined;
    await addNhiDependent({ employeeId: empId, name, relationship: relationship || undefined });
    await loadEmployee(empId);
  }

  async function onAddTax() {
    if (!empId) return;
    const name = prompt("扶養親屬姓名？");
    if (!name) return;
    const relationship = prompt("關係？") ?? undefined;
    await addTaxDependent({ employeeId: empId, name, relationship: relationship || undefined });
    await loadEmployee(empId);
  }

  async function onRun(e: FormEvent) {
    e.preventDefault();
    setRunMsg(null);
    try {
      await runPayroll(runPeriod);
      setRunMsg(`已執行 ${runPeriod} 薪資作業`);
      if (listPeriod === runPeriod) await loadPayslips();
    } catch (err) {
      setRunMsg(err instanceof Error ? err.message : "執行失敗");
    }
  }

  const loadPayslips = useCallback(async () => {
    try {
      const res = await getPayslips(listPeriod || undefined);
      setPayslips(res.payslips);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入薪資單失敗");
    }
  }, [listPeriod]);

  useEffect(() => {
    void loadPayslips();
  }, [loadPayslips]);

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? id.slice(0, 8);

  return (
    <>
      <PageHeader title="薪資作業" desc="員工薪資保險資料、執行薪資作業與薪資單查詢" />
      {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">員工薪資保險資料</h2>
        <div className="mb-4">
          <label className={labelCls}>員工（工號/姓名）</label>
          <select className={inputCls} value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">請選擇</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        {empId && (
          <>
            <form onSubmit={onSaveSalary} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>計薪方式</label>
                  <select
                    className={inputCls}
                    value={method}
                    onChange={(e) => setMethod(e.target.value as "monthly" | "by_attendance_days")}
                  >
                    <option value="monthly">月薪</option>
                    <option value="by_attendance_days">按出勤天數</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>本薪（月）</label>
                  <input type="number" className={inputCls} value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>時薪（加班費基準）</label>
                  <input type="number" className={inputCls} value={hourlyWage} onChange={(e) => setHourlyWage(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <PrimaryButton type="submit">儲存薪資資料</PrimaryButton>
                {salaryMsg && <span className="text-sm text-green-600">{salaryMsg}</span>}
              </div>
            </form>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-600">健保眷屬投保資料</h3>
                  <button onClick={onAddNhi} className="text-sm font-medium" style={{ color: "var(--brand)" }}>＋ 新增</button>
                </div>
                <ul className="divide-y divide-gray-100 text-sm">
                  {nhiDeps.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-1.5">
                      <span>{d.name} <span className="text-xs text-gray-500">{d.relationship ?? ""}</span></span>
                      <button onClick={() => deleteNhiDependent(d.id).then(() => loadEmployee(empId))} className="text-red-600 hover:underline">刪除</button>
                    </li>
                  ))}
                  {nhiDeps.length === 0 && <li className="py-1.5 text-gray-400">無</li>}
                </ul>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-600">所得稅扶養親屬資料</h3>
                  <button onClick={onAddTax} className="text-sm font-medium" style={{ color: "var(--brand)" }}>＋ 新增</button>
                </div>
                <ul className="divide-y divide-gray-100 text-sm">
                  {taxDeps.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-1.5">
                      <span>{d.name} <span className="text-xs text-gray-500">{d.relationship ?? ""}</span></span>
                      <button onClick={() => deleteTaxDependent(d.id).then(() => loadEmployee(empId))} className="text-red-600 hover:underline">刪除</button>
                    </li>
                  ))}
                  {taxDeps.length === 0 && <li className="py-1.5 text-gray-400">無</li>}
                </ul>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">執行薪資/獎金作業</h2>
        <form onSubmit={onRun} className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelCls}>薪資期間</label>
            <input type="month" className={inputCls} value={runPeriod} onChange={(e) => setRunPeriod(e.target.value)} />
          </div>
          <PrimaryButton type="submit">執行</PrimaryButton>
          {runMsg && <span className="text-sm text-green-600">{runMsg}</span>}
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">查詢/列印（薪資單）</h2>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className={labelCls}>期間</label>
            <input type="month" className={inputCls} value={listPeriod} onChange={(e) => setListPeriod(e.target.value)} />
          </div>
          <PrimaryButton type="button" onClick={() => void loadPayslips()}>查詢</PrimaryButton>
        </div>
        {payslips.length === 0 ? (
          <Empty>查無薪資單</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-4">員工</th>
                  <th className="py-2 pr-4">期間</th>
                  <th className="py-2 pr-4">本薪</th>
                  <th className="py-2 pr-4">加班費</th>
                  <th className="py-2 pr-4">應發合計</th>
                  <th className="py-2 pr-4">狀態</th>
                  <th className="py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{empName(p.employee_id)}</td>
                    <td className="py-2 pr-4">{p.period}</td>
                    <td className="py-2 pr-4">{p.base}</td>
                    <td className="py-2 pr-4">{p.overtime_pay}</td>
                    <td className="py-2 pr-4 font-medium">{p.gross}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "finalized" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {p.status === "finalized" ? "已定案" : "草稿"}
                      </span>
                    </td>
                    <td className="py-2">
                      {p.status !== "finalized" && (
                        <button
                          onClick={() => finalizePayslip(p.id).then(() => loadPayslips())}
                          className="text-sm font-medium"
                          style={{ color: "var(--brand)" }}
                        >
                          定案
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
