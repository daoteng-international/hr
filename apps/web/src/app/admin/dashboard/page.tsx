"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PageHeader, Empty, ErrorText, PrimaryButton } from "@/components/admin-ui";
import {
  getHeadcount,
  getDepartments,
  type HeadcountMonth,
  type Department,
} from "@/lib/admin-api";

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

export default function DashboardPage() {
  const now = new Date();
  const ym = (d: Date) => d.toISOString().slice(0, 7);
  const [from, setFrom] = useState(ym(new Date(now.getFullYear(), now.getMonth() - 5, 1)));
  const [to, setTo] = useState(ym(now));
  const [deptId, setDeptId] = useState("");
  const [empType, setEmpType] = useState("");
  const [jobGroup, setJobGroup] = useState("");
  const [depts, setDepts] = useState<Department[]>([]);
  const [series, setSeries] = useState<HeadcountMonth[]>([]);
  const [totals, setTotals] = useState<{ opening: number; hires: number; exits: number; closing: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getHeadcount({
        from,
        to,
        deptId: deptId || undefined,
        employmentType: empType || undefined,
        jobGroup: jobGroup || undefined,
      });
      setSeries(res.series);
      setTotals(res.totals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    }
  }, [from, to, deptId, empType, jobGroup]);

  useEffect(() => {
    getDepartments().then((r) => setDepts(r.departments)).catch(() => null);
    void load();
  }, [load]);

  const max = Math.max(1, ...series.map((m) => Math.max(m.closing, m.opening)));

  return (
    <>
      <PageHeader title="Dashboard" desc="全公司在職人數分析（期初/新進/離職/期末）" />
      <Card>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div>
            <label className={labelCls}>起始月份</label>
            <input type="month" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>結束月份</label>
            <input type="month" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>單位</label>
            <select className={inputCls} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">全部</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>身分類別</label>
            <select className={inputCls} value={empType} onChange={(e) => setEmpType(e.target.value)}>
              <option value="">全部</option>
              <option value="regular">正職</option>
              <option value="parttime">兼職</option>
              <option value="contract">約聘</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>職務群組</label>
            <select className={inputCls} value={jobGroup} onChange={(e) => setJobGroup(e.target.value)}>
              <option value="">全部</option>
              <option value="employee">一般員工</option>
              <option value="manager">主管</option>
              <option value="hr_admin">HR 管理員</option>
            </select>
          </div>
          <div className="flex items-end">
            <PrimaryButton type="button" onClick={() => void load()}>查詢</PrimaryButton>
          </div>
        </div>
        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}

        {totals && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "期初在職", value: totals.opening, cls: "text-gray-800" },
              { label: "新進", value: totals.hires, cls: "text-green-600" },
              { label: "離職", value: totals.exits, cls: "text-red-600" },
              { label: "期末在職", value: totals.closing, cls: "text-gray-800" },
            ].map((c) => (
              <div key={c.label} className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-2xl font-bold ${c.cls}`}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {series.length === 0 ? (
          <Empty>無資料</Empty>
        ) : (
          <div className="space-y-2">
            {series.map((m) => (
              <div key={m.month} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-gray-600">{m.month}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(m.closing / max) * 100}%`, backgroundColor: "var(--brand)" }}
                  />
                </div>
                <span className="w-40 shrink-0 text-xs text-gray-500">
                  期末 {m.closing}｜新進 +{m.hires}｜離職 −{m.exits}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
