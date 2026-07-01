"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, PageHeader, Empty } from "@/components/admin-ui";
import { getRequests } from "@/lib/admin-api";

const LINKS: { href: string; label: string; desc: string }[] = [
  { href: "/admin/employees", label: "員工", desc: "邀請、編輯、停用員工" },
  { href: "/admin/onboarding", label: "報到管理", desc: "新進人員報到與建檔" },
  { href: "/admin/departments", label: "部門", desc: "組織架構維護" },
  { href: "/admin/org-chart", label: "公司組織圖", desc: "部門階層樹狀圖" },
  { href: "/admin/shifts", label: "班別", desc: "上下班時間與夜班" },
  { href: "/admin/schedules", label: "排班", desc: "指派員工班別" },
  { href: "/admin/approvals", label: "簽核", desc: "待處理的請假／加班／補卡" },
  { href: "/admin/announcements", label: "公佈欄", desc: "發佈內部公告" },
  { href: "/admin/leave-types", label: "假別與簽核流程", desc: "假別與各類別簽核者" },
  { href: "/admin/recruitment", label: "招募", desc: "職缺需求單與人才庫" },
];

export default function AdminOverview() {
  const [pending, setPending] = useState<number | null>(null);
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
    return () => {
      active = false;
    };
  }, []);

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
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-gray-100 p-4 transition hover:border-gray-300 hover:shadow-sm"
            >
              <p className="font-medium text-gray-800">{l.label}</p>
              <p className="mt-0.5 text-sm text-gray-500">{l.desc}</p>
            </Link>
          ))}
        </div>
        {LINKS.length === 0 && <Empty>無快捷連結</Empty>}
      </Card>
    </>
  );
}
