"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { EssHeader } from "@/components/EssHeader";
import {
  getBranding,
  getPunchToday,
  getAnnouncements,
  postPunch,
  type Branding,
  type PunchRecord,
  type Announcement,
} from "@/lib/ess-api";

function timeOf(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

/** Try to read a GPS fix; resolve to null if unavailable/denied/timed out. */
function tryGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: false },
    );
  });
}

function EssHome() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [status, setStatus] = useState<"working" | "off">("off");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPunch = useCallback(async () => {
    const today = await getPunchToday();
    setRecords(today.records);
    setStatus(today.status);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      // Branding + announcements are best-effort; punch is the core.
      const [brandRes, annRes] = await Promise.allSettled([
        getBranding(),
        getAnnouncements(),
      ]);
      if (!active) return;
      if (brandRes.status === "fulfilled") setBranding(brandRes.value.branding);
      if (annRes.status === "fulfilled") setAnnouncements(annRes.value.announcements);
      try {
        await loadPunch();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "載入打卡狀態失敗");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadPunch]);

  async function onPunch() {
    setPunching(true);
    setError(null);
    try {
      const fix = await tryGeolocation();
      await postPunch(
        fix
          ? { source: "gps", lat: fix.lat, lng: fix.lng }
          : { source: "web" },
      );
      await loadPunch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "打卡失敗");
    } finally {
      setPunching(false);
    }
  }

  const nextAction = status === "working" ? "下班打卡" : "上班打卡";

  return (
    <div className="min-h-screen bg-gray-50">
      <EssHeader
        appName={branding?.appName}
        primaryColor={branding?.primaryColor}
        active="home"
      />
      <main className="mx-auto max-w-2xl p-4 space-y-6">
        {/* Punch card */}
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">今日打卡</h2>
            <span
              className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                status === "working"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {status === "working" ? "上班中" : "未上班 / 已下班"}
            </span>
          </div>

          <button
            onClick={onPunch}
            disabled={punching || loading}
            className="w-full rounded-lg py-5 text-xl font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--brand)" }}
          >
            {punching ? "打卡中…" : nextAction}
          </button>

          {error && (
            <p className="text-sm text-red-600 mt-3" role="alert">
              {error}
            </p>
          )}

          {/* Today's records */}
          <div className="mt-5">
            <h3 className="text-sm font-medium text-gray-500 mb-2">今日紀錄</h3>
            {loading ? (
              <p className="text-sm text-gray-400">載入中…</p>
            ) : records.length === 0 ? (
              <p className="text-sm text-gray-400">尚無打卡紀錄</p>
            ) : (
              <ul className="space-y-1">
                {records.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span
                      className={
                        r.type === "in" ? "text-green-700" : "text-gray-600"
                      }
                    >
                      {r.type === "in" ? "上班" : "下班"}
                    </span>
                    <span className="text-gray-500 tabular-nums">
                      {timeOf(r.punch_at)}
                      {r.source ? ` · ${r.source}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Announcements */}
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">最新公告</h2>
          {loading ? (
            <p className="text-sm text-gray-400">載入中…</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-gray-400">目前沒有公告</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {announcements.map((a) => (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium text-gray-800">{a.title}</h3>
                    <time className="shrink-0 text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString("zh-TW")}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                    {a.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default function EssPage() {
  return (
    <AuthGate>
      <EssHome />
    </AuthGate>
  );
}
