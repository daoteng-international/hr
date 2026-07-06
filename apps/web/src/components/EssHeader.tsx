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

  const tab = (
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
      | "ai",
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
      className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3"
    >
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold" style={{ color: "var(--brand)" }}>
          {appName ?? "HR 差勤系統"}
        </span>
        <nav className="flex items-center gap-1">
          {tab("home", "今日打卡", "/ess")}
          {tab("requests", "我的申請", "/ess/requests")}
          {tab("notifications", "通知中心", "/ess/notifications")}
          {tab("schedule", "個人班表", "/ess/schedule")}
          {tab("punches", "打卡紀錄", "/ess/punches")}
          {tab("balances", "剩餘假別", "/ess/balances")}
          {tab("payslips", "我的薪資單", "/ess/payslips")}
          {tab("jobs", "內部職缺", "/ess/jobs")}
          {tab("ai", "AI 問答", "/ess/ai")}
          {tab("mydata", "我的資料", "/ess/mydata")}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <button
            onClick={() => router.push("/admin")}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            後台
          </button>
        )}
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          登出
        </button>
      </div>
    </header>
  );
}
