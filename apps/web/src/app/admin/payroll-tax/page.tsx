"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, Empty, ErrorText, PrimaryButton } from "@/components/admin-ui";
import { apiDownload } from "@/lib/api-client";
import {
  importSalaryAdjustments,
  getNonEmployeeIncome,
  createNonEmployeeIncome,
  computeTax,
  type NonEmployeeIncome,
} from "@/lib/admin-api";

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

export default function PayrollTaxPage() {
  const [error, setError] = useState<string | null>(null);

  // 批次調薪
  const [csv, setCsv] = useState("employeeId,effectiveDate,newSalary,reason\n");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // 非員工所得
  const [nei, setNei] = useState<NonEmployeeIncome[]>([]);
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [incomeType, setIncomeType] = useState("");

  // 補充保費試算
  const [calcAmount, setCalcAmount] = useState("50000");
  const [calcResult, setCalcResult] = useState<string | null>(null);

  const loadNei = useCallback(async () => {
    try {
      const res = await getNonEmployeeIncome();
      setNei(res["non-employee-income"]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    }
  }, []);

  useEffect(() => {
    void loadNei();
  }, [loadNei]);

  async function onImport(e: FormEvent) {
    e.preventDefault();
    setImportMsg(null);
    try {
      const res = await importSalaryAdjustments(csv);
      setImportMsg(`匯入 ${res.count} 筆，錯誤 ${res.errors.length} 筆`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    }
  }

  async function onCreateNei(e: FormEvent) {
    e.preventDefault();
    if (!payee.trim() || !amount) return;
    try {
      await createNonEmployeeIncome({
        payeeName: payee.trim(),
        incomeType: incomeType.trim() || undefined,
        amount: Number(amount),
        withholdRate: 0.1,
      });
      setPayee("");
      setAmount("");
      setIncomeType("");
      await loadNei();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增失敗");
    }
  }

  async function onCalc() {
    try {
      const res = await computeTax({
        kind: "bonus_premium",
        monthlyInsuredSalary: 40000,
        cumulativeBonusBefore: 0,
        thisBonus: Number(calcAmount),
      });
      setCalcResult(`補充保費：NT$ ${res.premium ?? 0}（投保 40,000 假設）`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "試算失敗");
    }
  }

  return (
    <>
      <PageHeader title="薪資法規" desc="批次調薪、非員工所得、二代健保補充保費試算、申報匯出" />
      <Card>
        <h2 className="mb-3 text-sm font-medium text-gray-500">申報作業匯出</h2>
        <div className="flex gap-3">
          <PrimaryButton type="button" onClick={() => apiDownload("/tax-filing/export?type=withholding", "扣繳申報明細.csv").catch((e) => setError(e.message))}>
            扣繳申報明細 CSV
          </PrimaryButton>
          <PrimaryButton type="button" onClick={() => apiDownload("/tax-filing/export?type=supplementary", "補充保費明細.csv").catch((e) => setError(e.message))}>
            補充保費明細 CSV
          </PrimaryButton>
        </div>
      </Card>
      {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}

      <Card>
        <h2 className="mb-2 text-sm font-medium text-gray-500">批次調薪匯入 (CSV)</h2>
        <p className="mb-3 text-xs text-gray-400">
          標題列：employeeId,effectiveDate,newSalary,reason（effectiveDate 為 YYYY-MM-DD）
        </p>
        <form onSubmit={onImport} className="space-y-3">
          <textarea
            className={`${inputCls} h-32 font-mono`}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <PrimaryButton type="submit">匯入</PrimaryButton>
            {importMsg && <span className="text-sm text-green-600">{importMsg}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">非員工所得（自動計算補充保費）</h2>
        <form onSubmit={onCreateNei} className="mb-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>受款人</label>
              <input className={inputCls} value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="講師甲" />
            </div>
            <div>
              <label className={labelCls}>所得類別</label>
              <input className={inputCls} value={incomeType} onChange={(e) => setIncomeType(e.target.value)} placeholder="執行業務" />
            </div>
            <div>
              <label className={labelCls}>金額</label>
              <input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
            </div>
          </div>
          <PrimaryButton type="submit">新增（扣繳 10%）</PrimaryButton>
        </form>
        {nei.length === 0 ? (
          <Empty>尚無資料</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {nei.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-gray-800">{r.payee_name}</span>
                <span className="text-gray-500">
                  金額 {r.amount}｜扣繳 {r.tax_withheld}｜補充保費 {r.supplementary_premium}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">二代健保補充保費試算（高額獎金）</h2>
        <div className="flex items-end gap-3">
          <div>
            <label className={labelCls}>本次獎金</label>
            <input className={inputCls} type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} />
          </div>
          <PrimaryButton type="button" onClick={onCalc}>
            試算
          </PrimaryButton>
        </div>
        {calcResult && <p className="mt-3 text-sm text-gray-700">{calcResult}</p>}
      </Card>
    </>
  );
}
