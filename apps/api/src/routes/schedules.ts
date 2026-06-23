import { Router, type Request, type Response, type NextFunction } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { requireTenant } from "../middleware/tenant.js"
import { requireHrAdmin } from "../middleware/role.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const schedulesRouter = Router()

// "YYYY-MM-DD".
const dateRe = /^\d{4}-\d{2}-\d{2}$/

const assignmentSchema = z.object({
  employeeId: z.string().uuid("employeeId must be a uuid"),
  workDate: z.string().regex(dateRe, "workDate must be YYYY-MM-DD"),
  shiftId: z.string().uuid().nullish(),
  status: z.string().trim().min(1).optional(),
})

// Accept either a single assignment (flat body) or a batch ({ assignments: [] }).
const createSchema = z.union([
  assignmentSchema,
  z.object({
    assignments: z.array(assignmentSchema).min(1, "assignments must not be empty"),
  }),
])

const querySchema = z.object({
  employeeId: z.string().uuid().optional(),
  from: z.string().regex(dateRe).optional(),
  to: z.string().regex(dateRe).optional(),
})

type Assignment = z.infer<typeof assignmentSchema>

function toRow(tenantId: string, a: Assignment) {
  return {
    tenant_id: tenantId,
    employee_id: a.employeeId,
    work_date: a.workDate,
    shift_id: a.shiftId ?? null,
    status: a.status ?? "scheduled",
  }
}

/**
 * POST /schedules — HR-admin assigns shifts. Accepts a single assignment or a
 * batch { assignments: [...] }. Upserts on the (tenant_id, employee_id,
 * work_date) unique index so re-assigning the same employee+date updates the
 * existing row instead of erroring. Tenant-scoped via res.locals.tenantId.
 *
 * Note: employeeId values are trusted to belong to this tenant via the FK +
 * the fact that the tenant_id we write is always the caller's own; a cross
 * tenant employeeId would still be written under THIS tenant_id, so it cannot
 * leak another tenant's data (and would orphan harmlessly).
 */
schedulesRouter.post(
  "/schedules",
  requireAuth,
  requireTenant,
  requireHrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() })
      return
    }

    const assignments: Assignment[] =
      "assignments" in parsed.data ? parsed.data.assignments : [parsed.data]
    const rows = assignments.map((a) => toRow(tenantId, a))

    try {
      const { data, error } = await supabaseAdmin
        .from("schedules")
        .upsert(rows, { onConflict: "tenant_id,employee_id,work_date" })
        .select("id")

      if (error) {
        next(new Error(`POST /schedules: ${error.message}`))
        return
      }
      res.status(201).json({ ids: (data ?? []).map((r) => r.id), count: data?.length ?? 0 })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * GET /schedules?employeeId=&from=&to= — list schedules.
 *
 * Role-based scoping (in addition to the always-on tenant filter):
 *   • HR admin / platform admin → may see the whole tenant; honours an optional
 *     employeeId filter.
 *   • Any other role → forced to their OWN employee row(s) regardless of the
 *     employeeId query param (so passing someone else's id reveals nothing).
 *
 * Uses supabaseAdmin (bypasses RLS); the explicit filters here are the
 * load-bearing guard.
 */
schedulesRouter.get(
  "/schedules",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json({ error: "unauthorized" })
      return
    }

    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() })
      return
    }
    const { employeeId, from, to } = parsed.data

    try {
      // Resolve the caller's own employee identity + role in this tenant.
      const { data: me, error: meErr } = await supabaseAdmin
        .from("employees")
        .select("id, role")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle()
      if (meErr) {
        next(new Error(`GET /schedules (me): ${meErr.message}`))
        return
      }

      const isHr = !!me && ["hr_admin", "platform_admin"].includes(me.role)

      let query = supabaseAdmin
        .from("schedules")
        .select("id, tenant_id, employee_id, work_date, shift_id, status, created_at")
        .eq("tenant_id", tenantId)

      if (isHr) {
        // HR may optionally narrow to one employee.
        if (employeeId) query = query.eq("employee_id", employeeId)
      } else {
        // Non-HR: always pinned to self. If they have no employee row, they get
        // an impossible filter → empty result (never another user's data).
        query = query.eq("employee_id", me?.id ?? "00000000-0000-0000-0000-000000000000")
      }

      if (from) query = query.gte("work_date", from)
      if (to) query = query.lte("work_date", to)

      const { data, error } = await query.order("work_date", { ascending: true })
      if (error) {
        next(new Error(`GET /schedules: ${error.message}`))
        return
      }
      res.status(200).json({ schedules: data ?? [] })
    } catch (err) {
      next(err)
    }
  },
)
