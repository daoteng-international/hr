"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls, labelCls } from "@/components/admin-ui";
import {
  getEmployees,
  getAttendanceDays,
  settleAttendance,
  type AttendanceDay,
  type Employee,
} from "@/lib/admin-api";

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

function minutes(value: number) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return `${h}時${m}分`;
}

export default function AttendanceSettlementPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<AttendanceDay[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const employeeName = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employees) map.set(employee.id, employee.name);
    return map;
  }, [employees]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAttendanceDays({
        employeeId: employeeId || undefined,
        from,
        to,
      });
      setRows(res.attendanceDays);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入結算資料失敗");
    } finally {
      setLoading(false);
    }
  }, [employeeId, from, to]);

  useEffect(() => {
    getEmployees().then((r) => setEmployees(r.employees)).catch(() => null);
    void load();
  }, [load]);

  async function onSettle(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await settleAttendance({ employeeId: employeeId || undefined, from, to });
      setMessage(`已結算 ${res.settled} 筆出勤日`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "結算失敗");
    }
  }

  return (
    <>
      <PageHeader title="結算作業" desc="依 Apollo 結算作業，產生員工每日出勤、遲到、加班與夜間分鐘" />

      <Card>
        <form onSubmit={onSettle} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>工號 / 姓名</label>
              <select className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">全部人員</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>結算日期（起）</label>
              <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>結算日期（迄）</label>
              <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <PrimaryButton type="submit">執行結算</PrimaryButton>
              <button type="button" onClick={() => void load()} className="rounded-md border px-4 py-2 text-sm">
                搜尋
              </button>
            </div>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <ErrorText>{error}</ErrorText>}
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">結算結果</h2>
        {loading ? (
          <Empty>載入中…</Empty>
        ) : rows.length === 0 ? (
          <Empty>查無結算資料</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-4">工號/姓名</th>
                  <th className="py-2 pr-4">日期</th>
                  <th className="py-2 pr-4">工作時數</th>
                  <th className="py-2 pr-4">遲到</th>
                  <th className="py-2 pr-4">加班</th>
                  <th className="py-2 pr-4">夜間</th>
                  <th className="py-2">狀態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">
                      {employeeName.get(row.employee_id) ?? row.employee_id.slice(0, 8)}
                    </td>
                    <td className="py-2 pr-4">{row.work_date}</td>
                    <td className="py-2 pr-4">{minutes(row.worked_minutes)}</td>
                    <td className="py-2 pr-4">{minutes(row.late_minutes)}</td>
                    <td className="py-2 pr-4">{minutes(row.overtime_minutes)}</td>
                    <td className="py-2 pr-4">{minutes(row.night_minutes)}</td>
                    <td className="py-2">{row.day_type ?? "—"}</td>
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
