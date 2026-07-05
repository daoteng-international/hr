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
const monthNow = new Date().toISOString().slice(0, 7);

function minutes(value: number) {
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${hours}時${mins}分`;
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function downloadCsv(rows: AttendanceDay[], employeeName: Map<string, string>, filename: string) {
  const header = ["薪資月份", "員工", "日期", "工作分鐘", "遲到分鐘", "加班分鐘", "夜間分鐘", "日別", "異常"];
  const csvRows = rows.map((row) => [
    filename,
    employeeName.get(row.employee_id) ?? row.employee_id,
    row.work_date,
    row.worked_minutes,
    row.late_minutes,
    row.overtime_minutes,
    row.night_minutes,
    row.day_type ?? "",
    row.anomaly ? JSON.stringify(row.anomaly) : "",
  ]);
  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `attendance-payroll-transfer-${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceSettlementPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<AttendanceDay[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(monthNow);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [dataType, setDataType] = useState<"all" | "worked" | "late" | "overtime" | "night" | "anomaly">("all");
  const [dayType, setDayType] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const employeeName = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employees) {
      map.set(employee.id, employee.emp_no ? `${employee.emp_no} · ${employee.name}` : employee.name);
    }
    return map;
  }, [employees]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (dayType && row.day_type !== dayType) return false;
      if (dataType === "worked") return row.worked_minutes > 0;
      if (dataType === "late") return row.late_minutes > 0;
      if (dataType === "overtime") return row.overtime_minutes > 0;
      if (dataType === "night") return row.night_minutes > 0;
      if (dataType === "anomaly") return !!row.anomaly;
      return true;
    });
  }, [dataType, dayType, rows]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (total, row) => {
        total.worked += row.worked_minutes;
        total.late += row.late_minutes;
        total.overtime += row.overtime_minutes;
        total.night += row.night_minutes;
        return total;
      },
      { worked: 0, late: 0, overtime: 0, night: 0 },
    );
  }, [filteredRows]);

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
    getEmployees().then((response) => setEmployees(response.employees)).catch(() => null);
    void load();
  }, [load]);

  function applyPayrollMonth() {
    const range = monthRange(payrollMonth);
    setFrom(range.start);
    setTo(range.end);
  }

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
      <PageHeader title="結算作業" desc="依薪資月份結算出勤、遲到、加班、夜間與薪資拋轉檔" />

      <Card>
        <form onSubmit={onSettle} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            <div>
              <label className={labelCls}>薪資月份</label>
              <div className="flex gap-2">
                <input type="month" className={inputCls} value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
                <button type="button" onClick={applyPayrollMonth} className="rounded-md border px-3 text-sm">
                  套用
                </button>
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className={labelCls}>工號 / 姓名</label>
              <select className={inputCls} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                <option value="">全部人員</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeName.get(employee.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>結算日期（起）</label>
              <input type="date" className={inputCls} value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>結算日期（迄）</label>
              <input type="date" className={inputCls} value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>資料類型</label>
              <select className={inputCls} value={dataType} onChange={(event) => setDataType(event.target.value as typeof dataType)}>
                <option value="all">全部</option>
                <option value="worked">有出勤</option>
                <option value="late">遲到</option>
                <option value="overtime">加班</option>
                <option value="night">夜間</option>
                <option value="anomaly">異常</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>日別</label>
              <input className={inputCls} value={dayType} onChange={(event) => setDayType(event.target.value)} placeholder="例：workday" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="submit">執行結算</PrimaryButton>
            <button type="button" onClick={() => void load()} className="rounded-md border px-4 py-2 text-sm">
              搜尋
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(filteredRows, employeeName, payrollMonth)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              匯出薪資拋轉檔
            </button>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <ErrorText>{error}</ErrorText>}
        </form>
      </Card>

      <Card>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">工作時數</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{minutes(summary.worked)}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs text-red-600">遲到</p>
            <p className="mt-1 text-xl font-semibold text-red-700">{minutes(summary.late)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs text-blue-600">加班</p>
            <p className="mt-1 text-xl font-semibold text-blue-700">{minutes(summary.overtime)}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-4">
            <p className="text-xs text-indigo-600">夜間</p>
            <p className="mt-1 text-xl font-semibold text-indigo-700">{minutes(summary.night)}</p>
          </div>
        </div>

        <h2 className="mb-4 text-sm font-medium text-gray-500">結算結果</h2>
        {loading ? (
          <Empty>載入中…</Empty>
        ) : filteredRows.length === 0 ? (
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
                  <th className="py-2 pr-4">日別</th>
                  <th className="py-2">異常</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">
                      {employeeName.get(row.employee_id) ?? row.employee_id.slice(0, 8)}
                    </td>
                    <td className="py-2 pr-4">{row.work_date}</td>
                    <td className="py-2 pr-4">{minutes(row.worked_minutes)}</td>
                    <td className="py-2 pr-4">{minutes(row.late_minutes)}</td>
                    <td className="py-2 pr-4">{minutes(row.overtime_minutes)}</td>
                    <td className="py-2 pr-4">{minutes(row.night_minutes)}</td>
                    <td className="py-2 pr-4">{row.day_type ?? "—"}</td>
                    <td className="py-2">{row.anomaly ? "有" : "—"}</td>
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
