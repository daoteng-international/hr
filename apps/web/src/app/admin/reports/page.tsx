"use client";

import { useEffect, useState } from "react";
import { apiDownload } from "@/lib/api-client";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls, labelCls } from "@/components/admin-ui";
import { getDepartments, getHeadcountReport, type Department, type HeadcountReport } from "@/lib/admin-api";

const today = new Date().toISOString().slice(0, 10);
const month = new Date().toISOString().slice(0, 7);
const monthStart = `${month}-01`;

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState(month);
  const [deptId, setDeptId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [headcount, setHeadcount] = useState<HeadcountReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getHeadcountReport(), getDepartments()])
      .then(([headcountReport, departmentRes]) => {
        setHeadcount(headcountReport);
        setDepartments(departmentRes.departments);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "載入報表中心失敗"));
  }, []);

  async function download(path: string, filename: string, key = filename) {
    setError(null);
    setDownloading(key);
    try {
      await apiDownload(path, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "下載失敗");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    await download(attendancePath(), `出勤報表_${from}_${to}.csv`, "all-attendance");
    await download(`/reports/leave?from=${from}&to=${to}&format=csv`, `表單報表_${from}_${to}.csv`, "all-leave");
    await download(`/reports/payroll?period=${period}&format=csv`, `薪資報表_${period}.csv`, "all-payroll");
    await download("/reports/headcount?format=csv", "人力快照.csv", "all-headcount");
  }

  function attendancePath() {
    const params = new URLSearchParams({ from, to, format: "csv" });
    if (deptId) params.set("deptId", deptId);
    return `/reports/attendance?${params.toString()}`;
  }

  const reportCards = [
    {
      key: "attendance",
      title: "出勤報表",
      desc: "工作分鐘、出勤天數、遲到、加班、夜間分鐘；支援單位篩選。",
      filename: `出勤報表_${from}_${to}.csv`,
      path: attendancePath(),
    },
    {
      key: "leave",
      title: "請假 / 表單報表",
      desc: "請假、加班、補卡、公出/出差依類別與狀態彙總。",
      filename: `表單報表_${from}_${to}.csv`,
      path: `/reports/leave?from=${from}&to=${to}&format=csv`,
    },
    {
      key: "payroll",
      title: "薪資報表",
      desc: "本俸、加班費、夜間加給、全勤獎金、應發合計。",
      filename: `薪資報表_${period}.csv`,
      path: `/reports/payroll?period=${period}&format=csv`,
    },
  ];

  return (
    <>
      <PageHeader
        title="報表中心"
        desc="對齊 Apollo 的出勤、請假/表單、薪資與人力快照報表入口，可批次下載 CSV"
      />

      {error && <ErrorText>{error}</ErrorText>}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">查詢條件</h2>
            <p className="mt-1 text-sm text-gray-500">出勤/表單使用日期區間，薪資使用薪資年月；出勤報表可依單位下載。</p>
          </div>
          <button
            type="button"
            onClick={() => void downloadAll()}
            disabled={downloading !== null}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            {downloading?.startsWith("all-") ? "批次下載中…" : "批次下載全部"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
          <div>
            <label className={labelCls}>出勤報表單位</label>
            <select className={inputCls} value={deptId} onChange={(event) => setDeptId(event.target.value)}>
              <option value="">全部單位</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reportCards.map((report) => (
          <Card key={report.key}>
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <h2 className="font-medium text-gray-800">{report.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{report.desc}</p>
                <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  匯出檔名：{report.filename}
                </div>
              </div>
              <div>
                <PrimaryButton
                  disabled={downloading === report.key}
                  onClick={() => void download(report.path, report.filename, report.key)}
                >
                  {downloading === report.key ? "下載中…" : "下載報表"}
                </PrimaryButton>
              </div>
            </div>
          </Card>
        ))}

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
              disabled={downloading === "headcount"}
              onClick={() => void download("/reports/headcount?format=csv", "人力快照.csv", "headcount")}
            >
              {downloading === "headcount" ? "下載中…" : "下載快照"}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </>
  );
}
