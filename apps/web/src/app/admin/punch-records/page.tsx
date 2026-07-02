"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, Empty, ErrorText, PrimaryButton } from "@/components/admin-ui";
import {
  getPunchRecordsAdmin,
  createManualPunch,
  getEmployees,
  type PunchRecord,
  type Employee,
} from "@/lib/admin-api";

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

const SOURCE_LABEL: Record<string, string> = {
  gps: "定位打卡",
  web: "網頁打卡",
  line: "LINE 打卡",
  manual: "補登",
};

export default function PunchRecordsPage() {
  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Apollo 打卡紀錄維護 filters: 工號/姓名(員工) + 查詢日期起迄.
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const [fEmp, setFEmp] = useState("");
  const [fFrom, setFFrom] = useState(weekAgo);
  const [fTo, setFTo] = useState(today);

  // 補登 form
  const [mEmp, setMEmp] = useState("");
  const [mAt, setMAt] = useState("");
  const [mType, setMType] = useState<"in" | "out">("in");
  const [mMsg, setMMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPunchRecordsAdmin({
        employeeId: fEmp || undefined,
        from: fFrom || undefined,
        to: fTo || undefined,
      });
      setRecords(res.records);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [fEmp, fFrom, fTo]);

  useEffect(() => {
    getEmployees().then((r) => setEmployees(r.employees)).catch(() => null);
    void load();
  }, [load]);

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? id.slice(0, 8);

  async function onManual(e: FormEvent) {
    e.preventDefault();
    setMMsg(null);
    if (!mEmp || !mAt) {
      setMMsg("請選擇員工與時間");
      return;
    }
    try {
      await createManualPunch({ employeeId: mEmp, punchAt: new Date(mAt).toISOString(), type: mType });
      setMMsg("補登完成");
      setMAt("");
      await load();
    } catch (err) {
      setMMsg(err instanceof Error ? err.message : "補登失敗");
    }
  }

  return (
    <>
      <PageHeader title="打卡紀錄維護" desc="查詢全公司打卡並進行補登" />

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">忘打卡補登</h2>
        <form onSubmit={onManual} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className={labelCls}>員工</label>
              <select className={inputCls} value={mEmp} onChange={(e) => setMEmp(e.target.value)}>
                <option value="">請選擇</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>時間</label>
              <input type="datetime-local" className={inputCls} value={mAt} onChange={(e) => setMAt(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>類型</label>
              <select className={inputCls} value={mType} onChange={(e) => setMType(e.target.value as "in" | "out")}>
                <option value="in">上班</option>
                <option value="out">下班</option>
              </select>
            </div>
            <div className="flex items-end">
              <PrimaryButton type="submit">補登</PrimaryButton>
            </div>
          </div>
          {mMsg && <p className="text-sm text-green-600">{mMsg}</p>}
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">打卡紀錄</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={labelCls}>員工</label>
            <select className={inputCls} value={fEmp} onChange={(e) => setFEmp(e.target.value)}>
              <option value="">全部</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>查詢日期（起）</label>
            <input type="date" className={inputCls} value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>查詢日期（迄）</label>
            <input type="date" className={inputCls} value={fTo} onChange={(e) => setFTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <PrimaryButton type="button" onClick={() => void load()}>搜尋</PrimaryButton>
          </div>
        </div>
        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}
        {loading ? (
          <Empty>載入中…</Empty>
        ) : records.length === 0 ? (
          <Empty>查無資料</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-4">工號/姓名</th>
                  <th className="py-2 pr-4">時間</th>
                  <th className="py-2 pr-4">類型</th>
                  <th className="py-2">打卡方式</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{empName(r.employee_id)}</td>
                    <td className="py-2 pr-4">{r.punch_at.replace("T", " ").slice(0, 16)}</td>
                    <td className="py-2 pr-4">{r.type === "in" ? "上班" : "下班"}</td>
                    <td className="py-2">{SOURCE_LABEL[r.source ?? ""] ?? r.source ?? "—"}</td>
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
