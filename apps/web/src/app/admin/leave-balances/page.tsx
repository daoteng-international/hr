"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls, labelCls } from "@/components/admin-ui";
import {
  getEmployees,
  getLeaveBalancesAdmin,
  getLeaveTypes,
  setLeaveBalance,
  type Employee,
  type LeaveBalance,
  type LeaveType,
} from "@/lib/admin-api";

const yearNow = new Date().getFullYear();

export default function LeaveBalancesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [year, setYear] = useState(yearNow);
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editLeaveTypeId, setEditLeaveTypeId] = useState("");
  const [entitled, setEntitled] = useState("");
  const [deferred, setDeferred] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const names = useMemo(() => {
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee.name]));
    const leaveTypeMap = new Map(leaveTypes.map((leaveType) => [leaveType.id, leaveType.name]));
    return { employeeMap, leaveTypeMap };
  }, [employees, leaveTypes]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceRes, employeeRes, leaveTypeRes] = await Promise.all([
        getLeaveBalancesAdmin({ employeeId: employeeId || undefined, year }),
        getEmployees(),
        getLeaveTypes(),
      ]);
      setBalances(balanceRes.balances);
      setEmployees(employeeRes.employees);
      setLeaveTypes(leaveTypeRes.leaveTypes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入假別時數失敗");
    } finally {
      setLoading(false);
    }
  }, [employeeId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!editEmployeeId || !editLeaveTypeId || !entitled) {
      setError("請選擇員工、假別並輸入可用時數");
      return;
    }
    try {
      await setLeaveBalance({
        employeeId: editEmployeeId,
        leaveTypeId: editLeaveTypeId,
        year,
        entitled: Number(entitled),
        deferred: deferred ? Number(deferred) : undefined,
      });
      setMessage("假別時數已儲存");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  return (
    <>
      <PageHeader title="假別時數管理" desc="對齊 Apollo：確認特殊假別、查詢剩餘假別時數、年度給假" />

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls}>年度</label>
            <input type="number" className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>工號 / 姓名</label>
            <select className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">全部人員</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <PrimaryButton onClick={() => void load()}>搜尋</PrimaryButton>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">年度給假 / 調整</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label className={labelCls}>員工</label>
            <select className={inputCls} value={editEmployeeId} onChange={(e) => setEditEmployeeId(e.target.value)}>
              <option value="">請選擇</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>假別</label>
            <select className={inputCls} value={editLeaveTypeId} onChange={(e) => setEditLeaveTypeId(e.target.value)}>
              <option value="">請選擇</option>
              {leaveTypes.map((leaveType) => (
                <option key={leaveType.id} value={leaveType.id}>{leaveType.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>可用時數</label>
            <input type="number" step="0.5" className={inputCls} value={entitled} onChange={(e) => setEntitled(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>遞延時數</label>
            <input type="number" step="0.5" className={inputCls} value={deferred} onChange={(e) => setDeferred(e.target.value)} />
          </div>
          <div className="flex items-end">
            <PrimaryButton type="submit">儲存</PrimaryButton>
          </div>
        </form>
        {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">剩餘假別時數</h2>
        {loading ? (
          <Empty>載入中…</Empty>
        ) : balances.length === 0 ? (
          <Empty>查無資料</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-4">姓名</th>
                  <th className="py-2 pr-4">年度</th>
                  <th className="py-2 pr-4">假別</th>
                  <th className="py-2 pr-4">可用</th>
                  <th className="py-2 pr-4">已用</th>
                  <th className="py-2">剩餘</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((balance) => {
                  const available = Number(balance.entitled) + Number(balance.deferred) - Number(balance.used);
                  return (
                    <tr key={balance.id} className="border-b border-gray-50">
                      <td className="py-2 pr-4 font-medium text-gray-800">
                        {names.employeeMap.get(balance.employee_id) ?? balance.employee_id.slice(0, 8)}
                      </td>
                      <td className="py-2 pr-4">{balance.year}</td>
                      <td className="py-2 pr-4">{names.leaveTypeMap.get(balance.leave_type_id) ?? balance.leave_type_id.slice(0, 8)}</td>
                      <td className="py-2 pr-4">{Number(balance.entitled) + Number(balance.deferred)}</td>
                      <td className="py-2 pr-4">{Number(balance.used)}</td>
                      <td className="py-2">{available}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
