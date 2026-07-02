"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { EssHeader } from "@/components/EssHeader";
import {
  getBranding,
  getMe,
  isAdminRole,
  getMySchedules,
  getShifts,
  acknowledgeSchedule,
  disputeSchedule,
  type Branding,
  type ScheduleRow,
  type Shift,
} from "@/lib/ess-api";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "已排班",
  confirmed: "已確認",
  disputed: "有異議",
  day_off: "休假",
};

// First/last day (YYYY-MM-DD) of a "YYYY-MM" month string.
function monthRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

function ScheduleInner() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ym, setYm] = useState(new Date().toISOString().slice(0, 7));

  const load = useCallback(async () => {
    try {
      const { from, to } = monthRange(ym);
      const res = await getMySchedules(from, to);
      setRows(res.schedules);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    }
  }, [ym]);

  useEffect(() => {
    getBranding().then((b) => setBranding(b.branding)).catch(() => null);
    getMe().then((m) => setIsAdmin(isAdminRole(m.role))).catch(() => null);
    getShifts().then((s) => setShifts(s.shifts)).catch(() => null);
    void load();
  }, [load]);

  const shiftLabel = (id: string | null) => {
    if (!id) return "—";
    const s = shifts.find((x) => x.id === id);
    return s ? `${s.name} ${s.start_time}~${s.end_time}` : id.slice(0, 8);
  };

  async function review(id: string, ok: boolean) {
    try {
      if (ok) await acknowledgeSchedule(id);
      else await disputeSchedule(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失敗");
    }
  }

  // 統計 (Apollo 個人班表 sidebar): scheduled workdays and day-offs this month.
  const workDays = rows.filter((r) => r.shift_id).length;
  const offDays = rows.filter((r) => r.status === "day_off").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <EssHeader appName={branding?.appName} primaryColor={branding?.primaryColor} active="schedule" isAdmin={isAdmin} />
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800">個人班表</h2>
            <input
              type="month"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={ym}
              onChange={(e) => setYm(e.target.value)}
            />
          </div>
          <p className="mb-4 text-sm text-gray-500">
            本月排班 {workDays} 天｜排休 {offDays} 天
          </p>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-24 font-medium text-gray-800">{r.work_date}</span>
                  <span className="text-gray-600">{shiftLabel(r.shift_id)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      r.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : r.status === "disputed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                {(r.status === "scheduled" || r.status === "disputed") && (
                  <div className="flex shrink-0 gap-3">
                    <button onClick={() => review(r.id, true)} className="text-sm font-medium" style={{ color: "var(--brand)" }}>
                      確認
                    </button>
                    <button onClick={() => review(r.id, false)} className="text-sm text-red-600 hover:underline">
                      異議
                    </button>
                  </div>
                )}
              </li>
            ))}
            {rows.length === 0 && <li className="py-3 text-sm text-gray-400">本月尚無排班</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <AuthGate>
      <ScheduleInner />
    </AuthGate>
  );
}
