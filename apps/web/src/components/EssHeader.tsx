"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * Shared ESS top bar. The app name + brand colour come from the tenant branding
 * (passed in by the page that fetched it); a back-office default is used until
 * the fetch lands. Also injects the tenant primaryColor as --brand so buttons
 * across the page pick it up.
 */
export function EssHeader({
  appName,
  primaryColor,
  active,
  isAdmin = false,
}: {
  appName?: string;
  primaryColor?: string;
  active:
    | "home"
    | "requests"
    | "notifications"
    | "mydata"
    | "punches"
    | "balances"
    | "schedule"
    | "payslips"
    | "jobs"
    | "ai";
  /** When the signed-in user is an HR/platform admin, show a link to /admin. */
  isAdmin?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await getSupabaseBrowser().auth.signOut();
    router.replace("/login");
  }

  const brandStyle = primaryColor
    ? ({ ["--brand" as string]: primaryColor } as React.CSSProperties)
    : undefined;

  const tabs: Array<{
    key:
      | "home"
      | "requests"
      | "notifications"
      | "mydata"
      | "punches"
      | "balances"
      | "schedule"
      | "payslips"
      | "jobs"
      | "ai";
    label: string;
    short: string;
    href: string;
  }> = [
    { key: "home", label: "今日打卡", short: "打卡", href: "/ess" },
    { key: "requests", label: "我的申請", short: "申請", href: "/ess/requests" },
    { key: "notifications", label: "通知中心", short: "通知", href: "/ess/notifications" },
    { key: "schedule", label: "個人班表", short: "班表", href: "/ess/schedule" },
    { key: "punches", label: "打卡紀錄", short: "紀錄", href: "/ess/punches" },
    { key: "balances", label: "剩餘假別", short: "假別", href: "/ess/balances" },
    { key: "payslips", label: "我的薪資單", short: "薪資", href: "/ess/payslips" },
    { key: "jobs", label: "內部職缺", short: "職缺", href: "/ess/jobs" },
    { key: "ai", label: "AI 問答", short: "AI", href: "/ess/ai" },
    { key: "mydata", label: "我的資料", short: "資料", href: "/ess/mydata" },
  ];

  const tab = (
    key: (typeof tabs)[number]["key"],
    label: string,
    href: string,
  ) => (
    <button
      onClick={() => router.push(href)}
      className={`text-sm font-medium px-3 py-1.5 rounded-md ${
        active === key ? "text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
      style={active === key ? { backgroundColor: "var(--brand)" } : undefined}
    >
      {label}
    </button>
  );

  return (
    <header
      style={brandStyle}
      className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-4"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/ess")}
          className="min-w-0 text-left text-base font-bold sm:text-lg"
          style={{ color: "var(--brand)" }}
        >
          <span className="block truncate">{appName ?? "HR 差勤系統"}</span>
          <span className="block text-xs font-medium text-gray-400 sm:hidden">員工自助 · 手機版</span>
        </button>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="rounded-full border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
            >
              後台
            </button>
          )}
          <button
            onClick={logout}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            登出
          </button>
        </div>
      </div>
      <nav className="-mx-3 mt-3 flex gap-1 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
        {tabs.map((item) => tab(item.key, item.label, item.href))}
      </nav>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-100 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {tabs.slice(0, 5).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => router.push(item.href)}
            className={`rounded-xl px-1 py-2 text-xs font-semibold ${
              active === item.key ? "text-white" : "text-gray-500"
            }`}
            style={active === item.key ? { backgroundColor: "var(--brand)" } : undefined}
          >
            {item.short}
          </button>
        ))}
      </nav>
    </header>
  );
}
