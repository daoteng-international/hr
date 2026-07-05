"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PageHeader, ErrorText, Empty, PrimaryButton, inputCls, labelCls } from "@/components/admin-ui";
import { getEmployees, getRequests, type Employee, type LeaveRequest, type RequestKind, type RequestStatus } from "@/lib/admin-api";

const KIND_LABEL: Record<RequestKind, string> = {
  leave: "請假",
  ot: "加班",
  fix_punch: "補卡",
  business_trip: "公出/出差",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "簽核中",
  approved: "已核准",
  rejected: "已駁回",
  cancelled: "已取消",
};

export default function FormRecordsPage() {
  const [records, setRecords] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [status, setStatus] = useState<"" | RequestStatus>("");
  const [kind, setKind] = useState<"" | RequestKind>("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employeeName = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employees) map.set(employee.id, employee.name);
    return map;
  }, [employees]);

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return records.filter((record) => {
      if (kind && record.kind !== kind) return false;
      if (!term) return true;
      const name = employeeName.get(record.employee_id) ?? "";
      return name.toLowerCase().includes(term) || record.employee_id.toLowerCase().includes(term);
    });
  }, [employeeName, kind, keyword, records]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, empRes] = await Promise.all([
        getRequests(status || undefined),
        getEmployees(),
      ]);
      setRecords(reqRes.requests);
      setEmployees(empRes.employees);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入表單紀錄失敗");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="表單紀錄管理" desc="對齊 Apollo：查詢請假、加班、補卡、公出/出差的申請紀錄與狀態" />

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label className={labelCls}>表單狀態</label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as "" | RequestStatus)}>
              <option value="">全部</option>
              <option value="pending">簽核中</option>
              <option value="approved">已核准</option>
              <option value="rejected">已駁回</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>表單類型</label>
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as "" | RequestKind)}>
              <option value="">全部</option>
              <option value="leave">請假</option>
              <option value="ot">加班</option>
              <option value="fix_punch">補卡</option>
              <option value="business_trip">公出/出差</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>工號 / 姓名</label>
            <input className={inputCls} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="輸入姓名或員工 ID" />
          </div>
          <div className="flex items-end">
            <PrimaryButton onClick={() => void load()}>搜尋</PrimaryButton>
          </div>
        </div>
      </Card>

      <Card>
        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}
        {loading ? (
          <Empty>載入中…</Empty>
        ) : filtered.length === 0 ? (
          <Empty>查無表單紀錄</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-4">申請日期</th>
                  <th className="py-2 pr-4">申請人</th>
                  <th className="py-2 pr-4">表單類型</th>
                  <th className="py-2 pr-4">內容</th>
                  <th className="py-2 pr-4">目前簽核人</th>
                  <th className="py-2">狀態</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4">{record.created_at.slice(0, 10)}</td>
                    <td className="py-2 pr-4 font-medium text-gray-800">
                      {employeeName.get(record.employee_id) ?? record.employee_id.slice(0, 8)}
                    </td>
                    <td className="py-2 pr-4">{KIND_LABEL[record.kind]}</td>
                    <td className="py-2 pr-4">
                      {record.start_at.slice(0, 16).replace("T", " ")} → {record.end_at.slice(0, 16).replace("T", " ")}
                      {record.hours != null ? `，${record.hours} 小時` : ""}
                    </td>
                    <td className="py-2 pr-4">第 {record.current_step} 關</td>
                    <td className="py-2">{STATUS_LABEL[record.status]}</td>
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
