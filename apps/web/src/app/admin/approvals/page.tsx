"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PageHeader, ErrorText, Empty } from "@/components/admin-ui";
import {
  getRequests,
  getEmployees,
  approveRequest,
  rejectRequest,
  type LeaveRequest,
  type RequestKind,
  type Employee,
} from "@/lib/admin-api";

const KIND_LABEL: Record<RequestKind, string> = {
  leave: "請假",
  ot: "加班",
  fix_punch: "補卡",
  business_trip: "公出/出差",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApprovalsPage() {
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const empName = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, empRes] = await Promise.all([getRequests("pending"), getEmployees()]);
      setRows(reqRes.requests);
      setEmployees(empRes.employees);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      if (action === "approve") await approveRequest(id);
      else await rejectRequest(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "處理失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader title="簽核" desc="待處理的請假／加班／補卡申請" />

      <Card>
        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}
        {loading ? (
          <Empty>載入中…</Empty>
        ) : rows.length === 0 ? (
          <Empty>目前沒有待簽核的申請</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{KIND_LABEL[r.kind]}</span>
                      <span className="text-sm text-gray-500">
                        {empName.get(r.employee_id) ?? r.employee_id}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        第 {r.current_step} 關
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {fmt(r.start_at)} → {fmt(r.end_at)}
                      {r.hours != null ? ` · ${r.hours} 小時` : ""}
                    </p>
                    {r.reason && <p className="mt-1 text-sm text-gray-600">{r.reason}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => decide(r.id, "approve")}
                      disabled={busyId === r.id}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      核准
                    </button>
                    <button
                      onClick={() => decide(r.id, "reject")}
                      disabled={busyId === r.id}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      駁回
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
