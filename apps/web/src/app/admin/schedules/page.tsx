"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls, labelCls } from "@/components/admin-ui";
import {
  getEmployees,
  getShifts,
  getSchedules,
  assignSchedule,
  type Employee,
  type Shift,
  type Schedule,
} from "@/lib/admin-api";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function SchedulesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // assign form
  const [employeeId, setEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState(todayIso());
  const [shiftId, setShiftId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // query filters
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(plusDaysIso(14));
  const [filterEmp, setFilterEmp] = useState("");

  const empName = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const shiftName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of shifts) m.set(s.id, s.name);
    return m;
  }, [shifts]);

  const runQuery = useCallback(async () => {
    try {
      const res = await getSchedules({
        from,
        to,
        employeeId: filterEmp || undefined,
      });
      setSchedules(res.schedules);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "查詢失敗");
    }
  }, [from, to, filterEmp]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [empRes, shiftRes] = await Promise.all([getEmployees(), getShifts()]);
        if (!active) return;
        setEmployees(empRes.employees);
        setShifts(shiftRes.shifts);
        if (empRes.employees[0]) setEmployeeId(empRes.employees[0].id);
        await runQuery();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "載入失敗");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // runQuery intentionally omitted: we only want the initial load here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setOkMsg(null);
    if (!employeeId || !workDate) {
      setFormError("請選擇員工與日期");
      return;
    }
    setSubmitting(true);
    try {
      await assignSchedule({
        employeeId,
        workDate,
        shiftId: shiftId || undefined,
      });
      setOkMsg("已指派");
      await runQuery();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "指派失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="排班" desc="指派員工班別並查詢" />

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">指派班別</h2>
        <form onSubmit={onAssign} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>員工</label>
              <select className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>日期</label>
              <input
                type="date"
                className={inputCls}
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>班別</label>
              <select className={inputCls} value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                <option value="">（休假／不指定）</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {formError && <ErrorText>{formError}</ErrorText>}
          {okMsg && <p className="text-sm text-green-600">{okMsg}</p>}
          <PrimaryButton type="submit" disabled={submitting || employees.length === 0}>
            {submitting ? "指派中…" : "指派"}
          </PrimaryButton>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">查詢排班</h2>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls}>起</label>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>訖</label>
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>員工</label>
            <select className={inputCls} value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
              <option value="">全部</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <PrimaryButton onClick={() => void runQuery()}>查詢</PrimaryButton>
          </div>
        </div>

        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}
        {loading ? (
          <Empty>載入中…</Empty>
        ) : schedules.length === 0 ? (
          <Empty>此區間尚無排班</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {schedules.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="tabular-nums text-gray-500">{s.work_date}</span>
                <span className="font-medium text-gray-800">{empName.get(s.employee_id) ?? s.employee_id}</span>
                <span className="text-gray-600">
                  {s.shift_id ? (shiftName.get(s.shift_id) ?? "班別") : "休假"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
