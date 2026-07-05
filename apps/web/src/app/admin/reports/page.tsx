"use client";

import { useEffect, useState } from "react";
import { apiDownload } from "@/lib/api-client";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls, labelCls } from "@/components/admin-ui";
import { getHeadcountReport, type HeadcountReport } from "@/lib/admin-api";

const today = new Date().toISOString().slice(0, 10);
const month = new Date().toISOString().slice(0, 7);
const monthStart = `${month}-01`;

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState(month);
  const [headcount, setHeadcount] = useState<HeadcountReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHeadcountReport()
      .then(setHeadcount)
      .catch((err) => setError(err instanceof Error ? err.message : "載入人力報表失敗"));
  }, []);

  function download(path: string, filename: string) {
    setError(null);
    apiDownload(path, filename).catch((err) =>
      setError(err instanceof Error ? err.message : "下載失敗"),
    );
  }

  return (
    <>
      <PageHeader
        title="報表中心"
        desc="對齊 Apollo 的 Attendance / Payroll / Dashboard 報表入口，可下載 CSV"
      />

      {error && <ErrorText>{error}</ErrorText>}

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">查詢條件</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>資料區間（起）</label>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>資料區間（迄）</label>
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>薪資年月</label>
            <input type="month" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-medium text-gray-800">出勤報表</h2>
          <p className="mt-1 text-sm text-gray-500">工作分鐘、出勤天數、遲到、加班、夜間分鐘。</p>
          <div className="mt-4">
            <PrimaryButton
              onClick={() =>
                download(
                  `/reports/attendance?from=${from}&to=${to}&format=csv`,
                  `出勤報表_${from}_${to}.csv`,
                )
              }
            >
              下載報表
            </PrimaryButton>
          </div>
        </Card>

        <Card>
          <h2 className="font-medium text-gray-800">請假 / 表單報表</h2>
          <p className="mt-1 text-sm text-gray-500">請假、加班、補卡、公出/出差依類別與狀態彙總。</p>
          <div className="mt-4">
            <PrimaryButton
              onClick={() =>
                download(`/reports/leave?from=${from}&to=${to}&format=csv`, `表單報表_${from}_${to}.csv`)
              }
            >
              下載報表
            </PrimaryButton>
          </div>
        </Card>

        <Card>
          <h2 className="font-medium text-gray-800">薪資報表</h2>
          <p className="mt-1 text-sm text-gray-500">本俸、加班費、夜間加給、全勤獎金、應發合計。</p>
          <div className="mt-4">
            <PrimaryButton
              onClick={() =>
                download(`/reports/payroll?period=${period}&format=csv`, `薪資報表_${period}.csv`)
              }
            >
              下載報表
            </PrimaryButton>
          </div>
        </Card>

        <Card>
          <h2 className="font-medium text-gray-800">人力快照</h2>
          {headcount ? (
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p>
                總人數：<span className="font-semibold text-gray-900">{headcount.total}</span>
              </p>
              <p>狀態：{Object.entries(headcount.byStatus).map(([k, v]) => `${k} ${v}`).join(" / ") || "無"}</p>
              <p>角色：{Object.entries(headcount.byRole).map(([k, v]) => `${k} ${v}`).join(" / ") || "無"}</p>
            </div>
          ) : (
            <Empty>載入中…</Empty>
          )}
          <div className="mt-4">
            <PrimaryButton
              onClick={() => download("/reports/headcount?format=csv", "人力快照.csv")}
            >
              下載快照
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </>
  );
}
