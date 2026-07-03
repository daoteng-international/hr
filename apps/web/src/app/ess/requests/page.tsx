"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/AuthGate";
import { EssHeader } from "@/components/EssHeader";
import { getEmployees, type Employee } from "@/lib/admin-api";
import {
  getBranding,
  getRequests,
  createRequest,
  cancelRequest,
  getLeaveTypes,
  getLeaveBalances,
  getMe,
  isAdminRole,
  type LeaveBalance,
  type LeaveSegment,
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
  business_trip: "公出/出差",
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
  // Apollo form-parity extras
  const [agentName, setAgentName] = useState("");
  const [payout, setPayout] = useState<"pay" | "comp_time">("pay");
  const [tripType, setTripType] = useState<"outing" | "business_trip">("outing");
  const [location, setLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // 代申請 (HR only)
  const [proxy, setProxy] = useState(false);
  const [proxyEmpId, setProxyEmpId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  // 即時餘額
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  // 多段日期
  const [segments, setSegments] = useState<LeaveSegment[]>([]);

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
      if (meRes.status === "fulfilled") {
        const admin = isAdminRole(meRes.value.role);
        setIsAdmin(admin);
        if (admin) getEmployees().then((r) => setEmployees(r.employees)).catch(() => null);
      }
      getLeaveBalances().then((r) => setBalances(r.balances)).catch(() => null);
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

  // 剩餘 X 時 X 分 for the currently selected leave type (across years).
  function remainingFor(typeId: string): number | null {
    const rows = balances.filter((b) => b.leave_type_id === typeId);
    if (rows.length === 0) return null;
    return rows.reduce(
      (sum, b) => sum + Number(b.entitled) + Number(b.deferred) - Number(b.used),
      0,
    );
  }
  const fmtHours = (h: number) => `${Math.floor(h)} 時 ${Math.round((h - Math.floor(h)) * 60)} 分`;

  const segHours = (a: string, b: string) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    return Math.max(0, Math.round(((bh * 60 + bm - ah * 60 - am) / 60) * 100) / 100);
  };

  function addSegment() {
    setSegments((p) => [...p, { date: "", startTime: "09:00", endTime: "18:00", hours: 8 }]);
  }
  function updateSegment(i: number, patch: Partial<LeaveSegment>) {
    setSegments((p) =>
      p.map((seg, idx) => {
        if (idx !== i) return seg;
        const merged = { ...seg, ...patch };
        merged.hours = segHours(merged.startTime, merged.endTime);
        return merged;
      }),
    );
  }
  const segmentsTotal = segments.reduce((s, x) => s + x.hours, 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const segMode = kind === "leave" && segments.length > 0;
    if (segMode && segments.some((x) => !x.date)) {
      setFormError("請填寫每個日期段的日期");
      return;
    }
    if (!segMode && (!startAt || !endAt)) {
      setFormError("請填寫起訖時間");
      return;
    }
    setSubmitting(true);
    try {
      const useSegs = kind === "leave" && segments.length > 0 && segments.every((x) => x.date);
      await createRequest({
        kind,
        leaveTypeId: kind === "leave" && leaveTypeId ? leaveTypeId : undefined,
        onBehalfOfEmployeeId: proxy && proxyEmpId ? proxyEmpId : undefined,
        segments: useSegs ? segments : undefined,
        startAt: useSegs
          ? new Date(`${segments[0].date}T${segments[0].startTime}:00`).toISOString()
          : toIso(startAt),
        endAt: useSegs
          ? new Date(`${segments[segments.length - 1].date}T${segments[segments.length - 1].endTime}:00`).toISOString()
          : toIso(endAt),
        hours: useSegs ? segmentsTotal : hours ? Number(hours) : undefined,
        reason: reason.trim() || undefined,
        agentName: agentName.trim() || undefined,
        payout: kind === "ot" ? payout : undefined,
        tripType: kind === "business_trip" ? tripType : undefined,
        location: kind === "business_trip" ? location.trim() || undefined : undefined,
        remark: kind === "business_trip" ? remark.trim() || undefined : undefined,
      });
      // reset + refresh
      setLeaveTypeId("");
      setStartAt("");
      setEndAt("");
      setHours("");
      setReason("");
      setAgentName("");
      setSegments([]);
      setProxy(false);
      setProxyEmpId("");
      setPayout("pay");
      setTripType("outing");
      setLocation("");
      setRemark("");
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
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">申請人</label>
                <div className="flex items-center gap-6 text-sm text-gray-700">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="proxy" checked={!proxy} onChange={() => setProxy(false)} />
                    本人
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="proxy" checked={proxy} onChange={() => setProxy(true)} />
                    代申請
                  </label>
                  {proxy && (
                    <select value={proxyEmpId} onChange={(e) => setProxyEmpId(e.target.value)} className={inputCls}>
                      <option value="">請選擇員工</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

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
                <option value="business_trip">公出/出差</option>
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
                {leaveTypeId && !proxy && (
                  <p className="mt-1 text-xs text-gray-500">
                    {remainingFor(leaveTypeId) == null
                      ? "剩餘：－（尚未設定額度）"
                      : `剩餘：${fmtHours(Math.max(0, remainingFor(leaveTypeId) ?? 0))}`}
                    {(() => {
                      const rem = remainingFor(leaveTypeId);
                      const req = segments.length > 0 ? segmentsTotal : Number(hours) || 0;
                      return rem != null && req > rem ? (
                        <span className="ml-2 font-medium text-red-600">申請時數超過剩餘額度</span>
                      ) : null;
                    })()}
                  </p>
                )}
              </div>
            )}

            {kind === "leave" && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">日期段（多段請假）</label>
                  <button type="button" onClick={addSegment} className="text-sm font-medium" style={{ color: "var(--brand)" }}>
                    ＋ 新增
                  </button>
                </div>
                {segments.length === 0 ? (
                  <p className="text-xs text-gray-400">未新增日期段時，使用下方單一起訖時間。</p>
                ) : (
                  <div className="space-y-2">
                    {segments.map((seg, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                        <input type="date" value={seg.date} onChange={(e) => updateSegment(i, { date: e.target.value })} className="rounded-md border border-gray-300 px-2 py-1.5" />
                        <input type="time" value={seg.startTime} onChange={(e) => updateSegment(i, { startTime: e.target.value })} className="rounded-md border border-gray-300 px-2 py-1.5" />
                        <span>~</span>
                        <input type="time" value={seg.endTime} onChange={(e) => updateSegment(i, { endTime: e.target.value })} className="rounded-md border border-gray-300 px-2 py-1.5" />
                        <span className="text-xs text-gray-500">{seg.hours} 小時</span>
                        <button type="button" onClick={() => setSegments((pv) => pv.filter((_, idx) => idx !== i))} className="text-xs text-red-600 hover:underline">
                          移除
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-600">總計：{segmentsTotal} 小時</p>
                  </div>
                )}
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

            {kind === "ot" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">給付方式</label>
                <div className="flex gap-6 text-sm text-gray-700">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="payout" checked={payout === "pay"} onChange={() => setPayout("pay")} />
                    加班費
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="payout" checked={payout === "comp_time"} onChange={() => setPayout("comp_time")} />
                    補休
                  </label>
                </div>
              </div>
            )}

            {kind === "business_trip" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
                  <div className="flex gap-6 text-sm text-gray-700">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="tripType" checked={tripType === "outing"} onChange={() => setTripType("outing")} />
                      公出（一天以內）
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="tripType" checked={tripType === "business_trip"} onChange={() => setTripType("business_trip")} />
                      出差（一天以上）
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">地點</label>
                  <input maxLength={250} value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">備註（選填）</label>
                  <input maxLength={250} value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} />
                </div>
              </>
            )}

            {(kind === "leave" || kind === "business_trip") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">代理人（工號或姓名，選填）</label>
                <input value={agentName} onChange={(e) => setAgentName(e.target.value)} className={inputCls} />
              </div>
            )}

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
