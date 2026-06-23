"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/AuthGate";
import { EssHeader } from "@/components/EssHeader";
import {
  getBranding,
  getRequests,
  createRequest,
  cancelRequest,
  getLeaveTypes,
  getMe,
  isAdminRole,
  type Branding,
  type LeaveRequest,
  type LeaveType,
  type RequestKind,
  type RequestStatus,
} from "@/lib/ess-api";

const KIND_LABEL: Record<RequestKind, string> = {
  leave: "請假",
  ot: "加班",
  fix_punch: "補卡",
};

const STATUS_STYLE: Record<RequestStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "待簽核",
  approved: "已核准",
  rejected: "已駁回",
  cancelled: "已取消",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Convert a <input type="datetime-local"> value to an ISO string the API accepts. */
function toIso(local: string): string {
  return new Date(local).toISOString();
}

function RequestsView() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // form state
  const [kind, setKind] = useState<RequestKind>("leave");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    const res = await getRequests();
    setRequests(res.requests);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      // Leave types are HR-only on the API; treat failure as "no list".
      const [brandRes, ltRes, meRes] = await Promise.allSettled([
        getBranding(),
        getLeaveTypes(),
        getMe(),
      ]);
      if (!active) return;
      if (brandRes.status === "fulfilled") setBranding(brandRes.value.branding);
      if (ltRes.status === "fulfilled") setLeaveTypes(ltRes.value.leaveTypes);
      if (meRes.status === "fulfilled") setIsAdmin(isAdminRole(meRes.value.role));
      try {
        await loadRequests();
      } catch (err) {
        if (active) setListError(err instanceof Error ? err.message : "載入申請失敗");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadRequests]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!startAt || !endAt) {
      setFormError("請填寫起訖時間");
      return;
    }
    setSubmitting(true);
    try {
      await createRequest({
        kind,
        leaveTypeId: kind === "leave" && leaveTypeId ? leaveTypeId : undefined,
        startAt: toIso(startAt),
        endAt: toIso(endAt),
        hours: hours ? Number(hours) : undefined,
        reason: reason.trim() || undefined,
      });
      // reset + refresh
      setLeaveTypeId("");
      setStartAt("");
      setEndAt("");
      setHours("");
      setReason("");
      await loadRequests();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel(id: string) {
    try {
      await cancelRequest(id);
      await loadRequests();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "取消失敗");
    }
  }

  const inputCls =
    "w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

  return (
    <div className="min-h-screen bg-gray-50">
      <EssHeader
        appName={branding?.appName}
        primaryColor={branding?.primaryColor}
        active="requests"
        isAdmin={isAdmin}
      />
      <main className="mx-auto max-w-2xl p-4 space-y-6">
        {/* New request form */}
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">新增申請</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as RequestKind)}
                className={inputCls}
              >
                <option value="leave">請假</option>
                <option value="ot">加班</option>
                <option value="fix_punch">補卡</option>
              </select>
            </div>

            {kind === "leave" && leaveTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">假別</label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">（不指定）</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                <input
                  type="datetime-local"
                  required
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">結束時間</label>
                <input
                  type="datetime-local"
                  required
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">時數（選填）</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">原因（選填）</label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md px-5 py-2.5 font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {submitting ? "送出中…" : "送出申請"}
            </button>
          </form>
        </section>

        {/* My requests */}
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">我的申請</h2>
          {listError && (
            <p className="text-sm text-red-600 mb-3" role="alert">
              {listError}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-gray-400">載入中…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-gray-400">尚無申請紀錄</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {requests.map((r) => (
                <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">
                        {KIND_LABEL[r.kind]}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    {r.status === "pending" && (
                      <button
                        onClick={() => onCancel(r.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        取消
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {fmt(r.start_at)} → {fmt(r.end_at)}
                    {r.hours != null ? ` · ${r.hours} 小時` : ""}
                  </p>
                  {r.reason && (
                    <p className="mt-1 text-sm text-gray-600">{r.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <AuthGate>
      <RequestsView />
    </AuthGate>
  );
}
