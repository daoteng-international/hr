import { Router, type Request, type Response, type NextFunction } from "express"
import { requireAuth } from "../middleware/auth.js"
import { requireTenant } from "../middleware/tenant.js"
import { requireHrAdmin } from "../middleware/role.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const demoRouter = Router()

const DEMO_EMPLOYEES = [
  { empNo: "DEMO-001", name: "林佳穎", dept: "產品部", salary: 82000, late: 15, overtime: 240 },
  { empNo: "DEMO-002", name: "陳柏宇", dept: "產品部", salary: 76000, late: 45, overtime: 420 },
  { empNo: "DEMO-003", name: "王品萱", dept: "營運部", salary: 68000, late: 0, overtime: 120 },
  { empNo: "DEMO-004", name: "張哲維", dept: "營運部", salary: 62000, late: 25, overtime: 180 },
  { empNo: "DEMO-005", name: "吳思涵", dept: "門市部", salary: 52000, late: 60, overtime: 360 },
  { empNo: "DEMO-006", name: "黃冠廷", dept: "門市部", salary: 50000, late: 0, overtime: 90 },
  { empNo: "DEMO-007", name: "李承恩", dept: "工程部", salary: 88000, late: 10, overtime: 300 },
  { empNo: "DEMO-008", name: "郭怡君", dept: "工程部", salary: 92000, late: 0, overtime: 480 },
  { empNo: "DEMO-009", name: "周子翔", dept: "業務部", salary: 70000, late: 35, overtime: 210 },
  { empNo: "DEMO-010", name: "蔡孟庭", dept: "業務部", salary: 66000, late: 5, overtime: 150 },
  { empNo: "DEMO-011", name: "許雅婷", dept: "財務部", salary: 72000, late: 0, overtime: 60 },
  { empNo: "DEMO-012", name: "邱建宏", dept: "財務部", salary: 74000, late: 20, overtime: 120 },
  { empNo: "DEMO-013", name: "鄭宇辰", dept: "人資部", salary: 69000, late: 0, overtime: 90 },
  { empNo: "DEMO-014", name: "何欣妤", dept: "人資部", salary: 71000, late: 15, overtime: 180 },
  { empNo: "DEMO-015", name: "羅冠宇", dept: "客服部", salary: 56000, late: 50, overtime: 240 },
  { empNo: "DEMO-016", name: "曾以安", dept: "客服部", salary: 54000, late: 0, overtime: 120 },
  { empNo: "DEMO-017", name: "宋品睿", dept: "物流部", salary: 58000, late: 40, overtime: 360 },
  { empNo: "DEMO-018", name: "潘昱萱", dept: "物流部", salary: 57000, late: 10, overtime: 150 },
]

const DEMO_ANNOUNCEMENTS = [
  {
    title: "Demo：七月營運公告",
    body: "本週將示範 AI 助理、報表中心、通知中心、差勤與薪資作業流程。",
  },
  {
    title: "Demo：手機打卡提醒",
    body: "請員工於上班、下班時使用手機完成打卡；若忘記打卡，可由 ESS 送出補卡申請。",
  },
  {
    title: "Demo：薪資單開放查詢",
    body: "七月份薪資單已產生草稿，可在員工端查看個人薪資單，HR 可於後台檢視彙總。",
  },
]

function dateDaysAgo(daysAgo: number): string {
  const value = new Date(Date.now() - daysAgo * 86_400_000)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

function recentWorkDates(count: number): string[] {
  const dates: string[] = []
  for (let daysAgo = 1; dates.length < count && daysAgo < count * 3; daysAgo += 1) {
    const date = dateDaysAgo(daysAgo)
    const day = new Date(`${date}T00:00:00.000Z`).getUTCDay()
    if (day !== 0 && day !== 6) dates.push(date)
  }
  return dates.reverse()
}

function atTaipei(date: string, time: string): string {
  return new Date(`${date}T${time}:00+08:00`).toISOString()
}

async function firstOrCreate(
  table: "departments" | "shifts" | "leave_types",
  tenantId: string,
  match: Record<string, unknown>,
  row: Record<string, unknown>,
) {
  const { data: existing, error: findErr } = await supabaseAdmin
    .from(table)
    .select("id")
    .match({ tenant_id: tenantId, ...match })
    .limit(1)
    .maybeSingle()
  if (findErr) throw new Error(`demo ${table} find: ${findErr.message}`)
  if (existing?.id) return existing.id as string
  const { data: created, error: createErr } = await supabaseAdmin
    .from(table)
    .insert({ tenant_id: tenantId, ...row })
    .select("id")
    .single()
  if (createErr || !created) throw new Error(`demo ${table} insert: ${createErr?.message}`)
  return created.id as string
}

async function resolveCallerEmployeeId(tenantId: string, userId: string | undefined) {
  if (!userId) return null
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`demo caller: ${error.message}`)
  return (data?.id as string | undefined) ?? null
}

demoRouter.post(
  "/demo/seed",
  requireAuth,
  requireTenant,
  requireHrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const callerEmployeeId = await resolveCallerEmployeeId(tenantId, req.auth?.userId)
    const today = dateDaysAgo(0)
    const workDates = recentWorkDates(20)
    const year = Number(today.slice(0, 4))
    const period = today.slice(0, 7)

    try {
      const deptIds = new Map<string, string>()
      for (const dept of Array.from(new Set(DEMO_EMPLOYEES.map((employee) => employee.dept)))) {
        deptIds.set(dept, await firstOrCreate("departments", tenantId, { name: dept }, { name: dept }))
      }
      const dayShiftId = await firstOrCreate(
        "shifts",
        tenantId,
        { name: "Demo 日班 09:00-18:00" },
        { name: "Demo 日班 09:00-18:00", start_time: "09:00", end_time: "18:00", break_minutes: 60, is_night_shift: false },
      )
      const annualLeaveId = await firstOrCreate(
        "leave_types",
        tenantId,
        { code: "demo_annual" },
        { code: "demo_annual", name: "Demo 特休", paid: true, special: false },
      )

      const { data: existingEmployees, error: empFindErr } = await supabaseAdmin
        .from("employees")
        .select("id, emp_no")
        .eq("tenant_id", tenantId)
        .in("emp_no", DEMO_EMPLOYEES.map((employee) => employee.empNo))
      if (empFindErr) throw new Error(`demo employees find: ${empFindErr.message}`)
      const employeeIdByNo = new Map((existingEmployees ?? []).map((row) => [row.emp_no as string, row.id as string]))

      for (const employee of DEMO_EMPLOYEES) {
        const existingId = employeeIdByNo.get(employee.empNo)
        const row = {
          tenant_id: tenantId,
          emp_no: employee.empNo,
          name: employee.name,
          dept_id: deptIds.get(employee.dept),
          employment_type: "regular",
          hire_date: "2024-01-15",
          role: "employee",
          status: "active",
        }
        if (existingId) {
          const { error } = await supabaseAdmin.from("employees").update(row).eq("id", existingId).eq("tenant_id", tenantId)
          if (error) throw new Error(`demo employee update: ${error.message}`)
        } else {
          const { data: created, error } = await supabaseAdmin.from("employees").insert(row).select("id").single()
          if (error || !created) throw new Error(`demo employee insert: ${error?.message}`)
          employeeIdByNo.set(employee.empNo, created.id as string)
        }
      }

      const employeeIds = Array.from(employeeIdByNo.values())
      for (const table of ["notifications", "punch_records", "leave_requests"] as const) {
        const { error } = await supabaseAdmin.from(table).delete().eq("tenant_id", tenantId).in("employee_id", employeeIds)
        if (error) throw new Error(`demo cleanup ${table}: ${error.message}`)
      }
      const { error: annCleanupErr } = await supabaseAdmin
        .from("announcements")
        .delete()
        .eq("tenant_id", tenantId)
        .in("title", DEMO_ANNOUNCEMENTS.map((announcement) => announcement.title))
      if (annCleanupErr) throw new Error(`demo cleanup announcements: ${annCleanupErr.message}`)

      const scheduleRows: Record<string, unknown>[] = []
      const punchRows: Record<string, unknown>[] = []
      const attendanceRows: Record<string, unknown>[] = []
      const salaryRows: Record<string, unknown>[] = []
      const balanceRows: Record<string, unknown>[] = []
      const payslipRows: Record<string, unknown>[] = []
      const notificationRows: Record<string, unknown>[] = []
      const leaveRows: Record<string, unknown>[] = []

      for (const [employeeIndex, employee] of DEMO_EMPLOYEES.entries()) {
        const employeeId = employeeIdByNo.get(employee.empNo)
        if (!employeeId) continue
        const usedLeave = 4 + (employeeIndex % 5) * 4
        const deferredLeave = employeeIndex % 4 === 0 ? 16 : 8
        const attendanceBonus = employee.late > 0 ? 0 : 2000
        const nightPay = employee.dept === "物流部" || employee.empNo.endsWith("5") ? 1200 : 0
        const overtimePay = employee.overtime * 4
        salaryRows.push({
          tenant_id: tenantId,
          employee_id: employeeId,
          method: "monthly",
          base_salary: employee.salary,
          hourly_wage: Math.round(employee.salary / 240),
          labor_insured_salary: employee.salary,
          health_insured_salary: employee.salary,
          allowances: { demo: true, meal: 2400, transport: 1800 },
        })
        balanceRows.push({
          tenant_id: tenantId,
          employee_id: employeeId,
          leave_type_id: annualLeaveId,
          year,
          entitled: 112,
          used: usedLeave,
          deferred: deferredLeave,
        })
        payslipRows.push({
          tenant_id: tenantId,
          employee_id: employeeId,
          period,
          base: employee.salary,
          overtime_pay: overtimePay,
          night_pay: nightPay,
          attendance_bonus: attendanceBonus,
          gross: employee.salary + overtimePay + nightPay + attendanceBonus,
          breakdown: {
            demo: true,
            lines: [
              { label: "本薪", amount: employee.salary },
              { label: "加班費", amount: overtimePay },
              { label: "夜間加給", amount: nightPay },
              { label: "全勤獎金", amount: attendanceBonus },
            ],
          },
          status: employeeIndex % 4 === 0 ? "finalized" : "draft",
          version: 1,
        })
        notificationRows.push(
          {
            tenant_id: tenantId,
            employee_id: employeeId,
            type: employee.late > 30 ? "anomaly" : "announcement",
            title: employee.late > 30 ? "Demo 出勤風險提醒" : "Demo 歡迎通知",
            body: employee.late > 30 ? "本月遲到或加班偏高，建議 HR 追蹤。" : "這是一筆 demo 通知，可用來展示通知中心。",
            channel: "inapp",
            status: "pending",
            payload: { demo: true, channels: ["email"], read: employeeIndex % 3 === 0 },
          },
          {
            tenant_id: tenantId,
            employee_id: employeeId,
            type: "approval",
            title: "Demo 表單簽核提醒",
            body: "你的請假/加班申請已進入簽核流程，可在我的申請查看進度。",
            channel: "inapp",
            status: employeeIndex % 2 === 0 ? "sent" : "pending",
            payload: { demo: true, read: employeeIndex % 4 === 0 },
          },
        )

        for (const [index, workDate] of workDates.entries()) {
          const late = index % 7 === employeeIndex % 7 ? employee.late : 0
          const overtime = index % 8 === employeeIndex % 5 ? employee.overtime : 0
          const dayOff = employeeIndex % 9 === 0 && index % 10 === 0
          scheduleRows.push({ tenant_id: tenantId, employee_id: employeeId, work_date: workDate, shift_id: dayOff ? null : dayShiftId, status: dayOff ? "day_off" : index % 5 === 0 ? "confirmed" : "scheduled" })
          if (dayOff) {
            attendanceRows.push({
              tenant_id: tenantId,
              employee_id: employeeId,
              work_date: workDate,
              worked_minutes: 0,
              late_minutes: 0,
              overtime_minutes: 0,
              night_minutes: 0,
              day_type: "day_off",
              anomaly: null,
            })
            continue
          }
          punchRows.push({ tenant_id: tenantId, employee_id: employeeId, punch_at: atTaipei(workDate, late > 0 ? "09:15" : "09:00"), type: "in", source: "web", lat: 25.033, lng: 121.565, device_id: "demo-web" })
          punchRows.push({ tenant_id: tenantId, employee_id: employeeId, punch_at: atTaipei(workDate, overtime > 0 ? "19:30" : "18:00"), type: "out", source: "web", lat: 25.033, lng: 121.565, device_id: "demo-web" })
          attendanceRows.push({
            tenant_id: tenantId,
            employee_id: employeeId,
            work_date: workDate,
            worked_minutes: 480 + Math.min(overtime, 180),
            late_minutes: late,
            overtime_minutes: overtime,
            night_minutes: employee.empNo.endsWith("5") && index === 4 ? 60 : 0,
            day_type: "workday",
            anomaly: late > 0 || overtime > 240 ? { demo: true, late, overtime } : null,
          })
        }

        leaveRows.push({
          tenant_id: tenantId,
          employee_id: employeeId,
          kind: "leave",
          leave_type_id: annualLeaveId,
          start_at: atTaipei(workDates[1], "13:00"),
          end_at: atTaipei(workDates[1], "17:00"),
          hours: 4,
          reason: "Demo 下午請假",
          agent_name: "Demo 代理人",
          status: employeeIndex % 4 === 1 ? "pending" : "approved",
          current_step: 1,
        })
        leaveRows.push({
          tenant_id: tenantId,
          employee_id: employeeId,
          kind: "ot",
          leave_type_id: null,
          start_at: atTaipei(workDates[workDates.length - 2], "18:30"),
          end_at: atTaipei(workDates[workDates.length - 2], "20:30"),
          hours: 2,
          reason: "Demo 專案上線加班",
          payout: employeeIndex % 2 === 0 ? "pay" : "comp_time",
          status: employeeIndex % 5 === 0 ? "pending" : "approved",
          current_step: 1,
        })
        if (employeeIndex % 3 === 0) {
          leaveRows.push({
            tenant_id: tenantId,
            employee_id: employeeId,
            kind: "fix_punch",
            leave_type_id: null,
            start_at: atTaipei(workDates[2], "09:00"),
            end_at: atTaipei(workDates[2], "09:00"),
            hours: 0,
            reason: "Demo 忘記上班打卡",
            status: employeeIndex % 2 === 0 ? "pending" : "approved",
            current_step: 1,
          })
        }
        if (employeeIndex % 4 === 0) {
          leaveRows.push({
            tenant_id: tenantId,
            employee_id: employeeId,
            kind: "business_trip",
            leave_type_id: null,
            start_at: atTaipei(workDates[3], "10:00"),
            end_at: atTaipei(workDates[3], "16:00"),
            hours: 6,
            reason: "Demo 客戶拜訪",
            agent_name: "Demo 代理人",
            trip_type: "outing",
            location: "台北市信義區",
            remark: "Demo 公出資料",
            status: "approved",
            current_step: 1,
          })
        }
      }

      const upserts: Array<[string, Record<string, unknown>[], string]> = [
        ["schedules", scheduleRows, "tenant_id,employee_id,work_date"],
        ["attendance_days", attendanceRows, "tenant_id,employee_id,work_date"],
        ["salary_structures", salaryRows, "tenant_id,employee_id"],
        ["leave_balances", balanceRows, "tenant_id,employee_id,leave_type_id,year"],
        ["payslips", payslipRows, "tenant_id,employee_id,period"],
      ]
      for (const [table, rows, onConflict] of upserts) {
        const { error } = await supabaseAdmin.from(table).upsert(rows, { onConflict })
        if (error) throw new Error(`demo upsert ${table}: ${error.message}`)
      }
      for (const [table, rows] of [
        ["punch_records", punchRows],
        ["leave_requests", leaveRows],
        ["notifications", notificationRows],
      ] as Array<[string, Record<string, unknown>[]]>) {
        const { error } = await supabaseAdmin.from(table).insert(rows)
        if (error) throw new Error(`demo insert ${table}: ${error.message}`)
      }

      const { error: annErr } = await supabaseAdmin.from("announcements").insert(
        DEMO_ANNOUNCEMENTS.map((announcement) => ({
          tenant_id: tenantId,
          title: announcement.title,
          body: announcement.body,
          audience: "all",
          created_by: callerEmployeeId,
        })),
      )
      if (annErr) throw new Error(`demo announcement: ${annErr.message}`)

      res.status(201).json({
        ok: true,
        period,
        employees: DEMO_EMPLOYEES.length,
        departments: deptIds.size,
        attendanceDays: attendanceRows.length,
        payslips: payslipRows.length,
        notifications: notificationRows.length,
        requests: leaveRows.length,
        punchRecords: punchRows.length,
        announcements: DEMO_ANNOUNCEMENTS.length,
      })
    } catch (err) {
      next(err)
    }
  },
)
