"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PageHeader, ErrorText, Empty, PrimaryButton, inputCls, labelCls } from "@/components/admin-ui";
import {
  batchDecideRequests,
  getEmployees,
  getRequests,
  rejectRequest,
  approveRequest,
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
  const [kind, setKind] = useState<"" | RequestKind>("");
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const empName = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employees) {
      map.set(employee.id, employee.emp_no ? `${employee.emp_no} · ${employee.name}` : employee.name);
    }
    return map;
  }, [employees]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = rows.length > 0 && rows.every((row) => selectedSet.has(row.id));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, empRes] = await Promise.all([
        getRequests({
          status: "pending",
          kind: kind || undefined,
          employeeId: employeeId || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
        getEmployees(),
      ]);
      setRows(reqRes.requests);
      setEmployees(empRes.employees);
      setSelectedIds((ids) => ids.filter((id) => reqRes.requests.some((request) => request.id === id)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [employeeId, from, kind, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleOne(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : rows.map((row) => row.id));
  }

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      if (action === "approve") await approveRequest(id, comment || undefined);
      else await rejectRequest(id, comment || undefined);
      setMessage(action === "approve" ? "已核准 1 張表單" : "已駁回 1 張表單");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "處理失敗");
    } finally {
      setBusyId(null);
    }
  }

  async function batch(action: "approve" | "reject") {
    if (selectedIds.length === 0) {
      setError("請先勾選要批次處理的表單");
      return;
    }
    setBusyId("batch");
    setError(null);
    setMessage(null);
    try {
      const result = await batchDecideRequests({
        ids: selectedIds,
        action,
        comment: comment || undefined,
      });
      setMessage(`批次完成：成功 ${result.ok} 張，失敗 ${result.failed} 張`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "批次處理失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader title="簽核" desc="待處理表單、批次核准/駁回、依人員與表單類型快速篩選" />

      <Card>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
          <div>
            <label className={labelCls}>表單類型</label>
            <select className={inputCls} value={kind} onChange={(event) => setKind(event.target.value as "" | RequestKind)}>
              <option value="">全部</option>
              <option value="leave">請假</option>
              <option value="ot">加班</option>
              <option value="fix_punch">補卡</option>
              <option value="business_trip">公出/出差</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className={labelCls}>員工</label>
            <select className={inputCls} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">全部人員</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.emp_no ? `${employee.emp_no} · ${employee.name}` : employee.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>申請起日</label>
            <input type="date" className={inputCls} value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <label className={labelCls}>申請迄日</label>
            <input type="date" className={inputCls} value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="flex items-end">
            <PrimaryButton onClick={() => void load()} disabled={loading}>
              搜尋
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div>
            <label className={labelCls}>簽核意見</label>
            <input
              className={inputCls}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="可輸入批次或單筆簽核意見"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void batch("reject")}
              disabled={busyId === "batch" || selectedIds.length === 0}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              批次駁回
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void batch("approve")}
              disabled={busyId === "batch" || selectedIds.length === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              批次核准
            </button>
          </div>
        </div>

        {message && <p className="mb-3 text-sm text-green-600">{message}</p>}
        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}
        {loading ? (
          <Empty>載入中…</Empty>
        ) : rows.length === 0 ? (
          <Empty>目前沒有待簽核的申請</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="w-10 py-2 pr-4">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="全選" />
                  </th>
                  <th className="py-2 pr-4">申請人</th>
                  <th className="py-2 pr-4">表單</th>
                  <th className="py-2 pr-4">期間 / 時數</th>
                  <th className="py-2 pr-4">目前關卡</th>
                  <th className="py-2 pr-4">原因 / 補充欄位</th>
                  <th className="py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 align-top">
                    <td className="py-3 pr-4">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`選取 ${row.id}`}
                      />
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-800">
                      {empName.get(row.employee_id) ?? row.employee_id.slice(0, 8)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {KIND_LABEL[row.kind]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {fmt(row.start_at)} → {fmt(row.end_at)}
                      {row.hours != null ? <span className="block text-xs text-gray-400">{row.hours} 小時</span> : null}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        第 {row.current_step} 關
                      </span>
                    </td>
                    <td className="max-w-xs py-3 pr-4 text-gray-600">
                      <p className="truncate">{row.reason || row.remark || "—"}</p>
                      {row.location && <p className="text-xs text-gray-400">地點：{row.location}</p>}
                      {row.agent_name && <p className="text-xs text-gray-400">代理人：{row.agent_name}</p>}
                      {row.payout && <p className="text-xs text-gray-400">加班給付：{row.payout === "pay" ? "加班費" : "補休"}</p>}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => void decide(row.id, "approve")}
                          disabled={busyId === row.id}
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        >
                          核准
                        </button>
                        <button
                          onClick={() => void decide(row.id, "reject")}
                          disabled={busyId === row.id}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        >
                          駁回
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
