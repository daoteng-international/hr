"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, PageHeader, Empty } from "@/components/admin-ui";
import { getBranding, getRequests } from "@/lib/admin-api";

const LINKS: { href: string; label: string; desc: string; module: string }[] = [
  { href: "/admin/dashboard", label: "Dashboard", desc: "在職人數分析", module: "Dashboard" },
  { href: "/admin/company-space", label: "Company Space", desc: "權限項目、人員權限、站台設定", module: "LinkUp" },
  { href: "/admin/announcements", label: "最新消息 / 公告", desc: "公司規章、部門公告、最新消息", module: "LinkUp" },
  { href: "/admin/onboarding", label: "Hire 報到管理", desc: "新進人員報到與建檔", module: "Foundation" },
  { href: "/admin/departments", label: "Org 單位", desc: "組織架構維護", module: "Foundation" },
  { href: "/admin/org-chart", label: "公司組織圖", desc: "部門階層樹狀圖", module: "Foundation" },
  { href: "/admin/employees", label: "People 人員", desc: "邀請、編輯、停用員工", module: "Foundation" },
  { href: "/admin/shifts", label: "班別", desc: "上下班時間與夜班", module: "Attendance" },
  { href: "/admin/schedules", label: "排班 / 班表審核", desc: "指派員工班別與班表確認", module: "Attendance" },
  { href: "/admin/punch-records", label: "打卡紀錄維護", desc: "查詢打卡與補登", module: "Attendance" },
  { href: "/admin/form-records", label: "表單紀錄管理", desc: "請假、加班、補卡、公出/出差全紀錄", module: "Attendance" },
  { href: "/admin/approvals", label: "待審核表單", desc: "待處理的請假／加班／補卡", module: "Attendance" },
  { href: "/admin/leave-types", label: "假別與簽核流程", desc: "假別與各類別簽核者", module: "Attendance" },
  { href: "/admin/leave-balances", label: "假別時數管理", desc: "查詢與設定員工年度可用時數", module: "Attendance" },
  { href: "/admin/attendance-settlement", label: "結算作業", desc: "差勤結算與出勤日彙整", module: "Attendance" },
  { href: "/admin/module-settings", label: "模組設定", desc: "行事曆、差勤薪資規則、功能參數", module: "Attendance" },
  { href: "/admin/reports", label: "報表中心", desc: "出勤、請假、薪資、人力報表", module: "Attendance" },
  { href: "/admin/payroll", label: "薪資 / 保險資料", desc: "薪資保險資料、執行薪資、薪資單", module: "Payroll" },
  { href: "/admin/payroll-tax", label: "所得稅 / 補充保費", desc: "批次調薪、非員工所得、補充保費", module: "Payroll" },
  { href: "/admin/recruitment", label: "招募 ATS", desc: "職缺需求單、人才庫、面試、錄用", module: "Recruitment" },
];

export default function AdminOverview() {
  const [pending, setPending] = useState<number | null>(null);
  const [widgets, setWidgets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRequests("pending")
      .then((res) => {
        if (active) setPending(res.requests.length);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "載入待簽核數失敗");
      });
    getBranding()
      .then((res) => {
        if (active) setWidgets(res.features?.dashboardWidgets ?? []);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  const visibleLinks =
    widgets.length === 0
      ? LINKS
      : LINKS.filter((link) => {
          if (widgets.includes("待簽核申請") && link.href === "/admin/approvals") return true;
          if (widgets.includes("期末在職") && link.href === "/admin/dashboard") return true;
          if (widgets.includes("新進/離職") && link.href === "/admin/onboarding") return true;
          if (widgets.includes("公告") && link.href === "/admin/announcements") return true;
          if (widgets.includes("薪資作業") && link.href === "/admin/payroll") return true;
          return !["/admin/approvals", "/admin/dashboard", "/admin/onboarding", "/admin/announcements", "/admin/payroll"].includes(link.href);
        });

  return (
    <>
      <PageHeader title="總覽" desc="後台管理首頁" />

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500">待簽核申請</h2>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {pending === null ? "—" : pending}
            </p>
          </div>
          <Link
            href="/admin/approvals"
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--brand)" }}
          >
            前往簽核
          </Link>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">快捷連結</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-gray-100 p-4 transition hover:border-gray-300 hover:shadow-sm"
            >
              <p className="text-xs font-medium text-gray-400">{l.module}</p>
              <p className="mt-1 font-medium text-gray-800">{l.label}</p>
              <p className="mt-0.5 text-sm text-gray-500">{l.desc}</p>
            </Link>
          ))}
        </div>
        {visibleLinks.length === 0 && <Empty>無快捷連結</Empty>}
      </Card>
    </>
  );
}
