"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, Empty, ErrorText, PrimaryButton } from "@/components/admin-ui";
import {
  getOnboardings,
  createOnboarding,
  completeOnboarding,
  deleteOnboarding,
  type Onboarding,
} from "@/lib/admin-api";

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

export default function OnboardingPage() {
  const [rows, setRows] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [identityType, setIdentityType] = useState("");
  const [region, setRegion] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOnboardings();
      setRows(res.onboardings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("請輸入姓名");
      return;
    }
    setSubmitting(true);
    try {
      await createOnboarding({
        name: name.trim(),
        identityType: identityType.trim() || null,
        region: region.trim() || null,
        reportDate: reportDate || null,
      });
      setName("");
      setIdentityType("");
      setRegion("");
      setReportDate("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function onComplete(id: string) {
    if (!confirm("確認完成報到？將建立正式員工資料。")) return;
    try {
      await completeOnboarding(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "報到失敗");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("刪除此報到資料？")) return;
    try {
      await deleteOnboarding(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除失敗");
    }
  }

  return (
    <>
      <PageHeader title="報到管理" desc="新進人員報到，完成後建立正式員工資料" />

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">新增報到</h2>
        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>姓名</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="王小明" />
            </div>
            <div>
              <label className={labelCls}>身分別</label>
              <input className={inputCls} value={identityType} onChange={(e) => setIdentityType(e.target.value)} placeholder="全職" />
            </div>
            <div>
              <label className={labelCls}>地區</label>
              <input className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="台北" />
            </div>
            <div>
              <label className={labelCls}>報到日</label>
              <input type="date" className={inputCls} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </div>
          </div>
          {formError && <ErrorText>{formError}</ErrorText>}
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "新增中…" : "新增報到"}
          </PrimaryButton>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">報到清單</h2>
        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}
        {loading ? (
          <Empty>載入中…</Empty>
        ) : rows.length === 0 ? (
          <Empty>尚無報到資料</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  {r.identity_type && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{r.identity_type}</span>
                  )}
                  {r.region && <span className="text-xs text-gray-500">{r.region}</span>}
                  {r.report_date && <span className="text-xs text-gray-400">報到 {r.report_date}</span>}
                  {r.status === "completed" ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">已報到</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">未報到</span>
                  )}
                </div>
                <div className="flex shrink-0 gap-3">
                  {r.status === "pending" && (
                    <button onClick={() => onComplete(r.id)} className="text-sm font-medium" style={{ color: "var(--brand)" }}>
                      完成報到
                    </button>
                  )}
                  <button onClick={() => onDelete(r.id)} className="text-sm text-red-600 hover:underline">
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
