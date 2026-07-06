"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminGate } from "@/components/AdminGate";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getBranding, type Branding, type Me } from "@/lib/admin-api";

const NAV_GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "LinkUp",
    items: [
      { href: "/admin", label: "後台總覽" },
      { href: "/admin/notifications", label: "通知中心" },
      { href: "/admin/announcements", label: "最新消息 / 公告" },
      { href: "/admin/company-space", label: "Company Space" },
    ],
  },
  {
    title: "Dashboard",
    items: [{ href: "/admin/dashboard", label: "人力分析" }],
  },
  {
    title: "Foundation",
    items: [
      { href: "/admin/onboarding", label: "Hire 報到管理" },
      { href: "/admin/departments", label: "Org 單位" },
      { href: "/admin/org-chart", label: "公司組織圖" },
      { href: "/admin/employees", label: "People 人員" },
    ],
  },
  {
    title: "Attendance",
    items: [
      { href: "/admin/shifts", label: "班別" },
      { href: "/admin/schedules", label: "排班 / 班表審核" },
      { href: "/admin/punch-records", label: "打卡紀錄維護" },
      { href: "/admin/form-records", label: "表單紀錄管理" },
      { href: "/admin/approvals", label: "待審核表單" },
      { href: "/admin/leave-types", label: "假別與簽核流程" },
      { href: "/admin/leave-balances", label: "假別時數管理" },
      { href: "/admin/attendance-settlement", label: "結算作業" },
      { href: "/admin/module-settings", label: "模組設定" },
      { href: "/admin/reports", label: "報表中心" },
    ],
  },
  {
    title: "Payroll",
    items: [
      { href: "/admin/payroll", label: "薪資 / 保險資料" },
      { href: "/admin/payroll-tax", label: "所得稅 / 補充保費" },
    ],
  },
  {
    title: "Recruitment",
    items: [{ href: "/admin/recruitment", label: "招募 ATS" }],
  },
];

function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    let active = true;
    getBranding()
      .then((res) => {
        if (active) setBranding(res.branding);
      })
      .catch(() => {
        /* branding is best-effort */
      });
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await getSupabaseBrowser().auth.signOut();
    router.replace("/login");
  }

  const brandStyle = branding?.primaryColor
    ? ({ ["--brand" as string]: branding.primaryColor } as React.CSSProperties)
    : undefined;

  // Active when the path matches exactly, or (for sub-pages) starts with the
  // nav href — but "/admin" only lights up on an exact match so it isn't always on.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div style={brandStyle} className="min-h-screen bg-gray-50 md:flex">
      {/* Sidebar */}
      <aside className="shrink-0 border-b border-gray-100 bg-white md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-lg font-bold" style={{ color: "var(--brand)" }}>
            {branding?.appName ?? "HR 後台"}
          </span>
        </div>
        <nav className="flex flex-wrap gap-2 px-3 pb-3 md:flex-col md:flex-nowrap">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="w-full">
              <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {group.title}
              </p>
              <div className="mt-1 flex flex-wrap gap-1 md:flex-col">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      isActive(item.href) ? "text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                    style={isActive(item.href) ? { backgroundColor: "var(--brand)" } : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-gray-100 px-5 py-4 md:block">
          <p className="truncate text-sm font-medium text-gray-700">{me.name}</p>
          <p className="truncate text-xs text-gray-400">{me.email}</p>
          <button onClick={logout} className="mt-2 text-sm text-gray-500 hover:text-gray-800">
            登出
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1">
        <header className="flex items-center justify-end border-b border-gray-100 bg-white px-4 py-3 md:hidden">
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
            登出
          </button>
        </header>
        <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{(me) => <Shell me={me}>{children}</Shell>}</AdminGate>;
}
