"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { EssHeader } from "@/components/EssHeader";
import {
  getBranding,
  getMe,
  isAdminRole,
  getPunchRecords,
  type Branding,
  type PunchHistoryRecord,
} from "@/lib/ess-api";

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none";

const SOURCE_LABEL: Record<string, string> = {
  gps: "定位打卡",
  web: "網頁打卡",
  line: "LINE 打卡",
  manual: "補登",
};

// Group in/out punches per date so the table reads 日期/上班/下班 (Apollo style).
interface DayRow {
  date: string;
  in?: PunchHistoryRecord;
  out?: PunchHistoryRecord;
  extra: PunchHistoryRecord[];
}

function groupByDay(records: PunchHistoryRecord[]): DayRow[] {
  const map = new Map<string, DayRow>();
  for (const r of records) {
    const date = r.punch_at.slice(0, 10);
    const row = map.get(date) ?? { date, extra: [] };
    if (r.type === "in" && !row.in) row.in = r;
    else if (r.type === "out") row.out = r; // keep latest out
    else row.extra.push(r);
    map.set(date, row);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

const hhmm = (iso: string) => iso.slice(11, 16);

function PunchesInner() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);

  const load = useCallback(async () => {
    try {
      const res = await getPunchRecords(from, to);
      setRows(groupByDay(res.records));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    }
  }, [from, to]);

  useEffect(() => {
    getBranding().then((b) => setBranding(b.branding)).catch(() => null);
    getMe().then((m) => setIsAdmin(isAdminRole(m.role))).catch(() => null);
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <EssHeader appName={branding?.appName} primaryColor={branding?.primaryColor} active="punches" isAdmin={isAdmin} />
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">打卡紀錄</h2>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">查詢日期（起）</label>
              <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">查詢日期（迄）</label>
              <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button
              onClick={() => void load()}
              className="rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              搜尋
            </button>
          </div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-4">日期</th>
                  <th className="py-2 pr-4">上班時間</th>
                  <th className="py-2 pr-4">打卡方式</th>
                  <th className="py-2 pr-4">下班時間</th>
                  <th className="py-2">打卡方式</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date} className="border-b border-gray-50">
                    <td className="py-2 pr-4">{r.date}</td>
                    <td className="py-2 pr-4">{r.in ? hhmm(r.in.punch_at) : "—"}</td>
                    <td className="py-2 pr-4">{r.in ? SOURCE_LABEL[r.in.source ?? ""] ?? r.in.source : ""}</td>
                    <td className="py-2 pr-4">{r.out ? hhmm(r.out.punch_at) : "—"}</td>
                    <td className="py-2">{r.out ? SOURCE_LABEL[r.out.source ?? ""] ?? r.out.source : ""}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-gray-400">查無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function PunchesPage() {
  return (
    <AuthGate>
      <PunchesInner />
    </AuthGate>
  );
}
