import { Router, type Request, type Response, type NextFunction } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { requireTenant } from "../middleware/tenant.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const employeeProfileRouter = Router()

const dateRe = /^\d{4}-\d{2}-\d{2}$/
const NIL = "00000000-0000-0000-0000-000000000000"

/**
 * Resolve the caller's own employee (id + role) in this tenant, then decide
 * whether they may act on `empId`: allowed when they ARE that employee, or when
 * they are HR/platform admin. Returns null (and the caller should 403) otherwise.
 */
async function authorize(
  tenantId: string,
  userId: string,
  empId: string,
): Promise<{ isHr: boolean; selfId: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`profile authorize: ${error.message}`)
  if (!data) return null
  const isHr = ["hr_admin", "platform_admin"].includes(data.role as string)
  if (!isHr && data.id !== empId) return null
  return { isHr, selfId: data.id as string }
}

const profileSchema = z.object({
  phone: z.string().trim().nullish(),
  personalEmail: z.string().trim().nullish(),
  address: z.string().trim().nullish(),
  emergencyContact: z.string().trim().nullish(),
  emergencyPhone: z.string().trim().nullish(),
  birthday: z.string().regex(dateRe).nullish(),
  gender: z.string().trim().nullish(),
  maritalStatus: z.string().trim().nullish(),
  note: z.string().trim().nullish(),
})

const educationSchema = z.object({
  school: z.string().trim().min(1),
  major: z.string().trim().nullish(),
  degree: z.string().trim().nullish(),
  startDate: z.string().regex(dateRe).nullish(),
  endDate: z.string().regex(dateRe).nullish(),
})

const certificationSchema = z.object({
  name: z.string().trim().min(1),
  issuer: z.string().trim().nullish(),
  issuedDate: z.string().regex(dateRe).nullish(),
  expiryDate: z.string().regex(dateRe).nullish(),
})

const workHistorySchema = z.object({
  company: z.string().trim().min(1),
  title: z.string().trim().nullish(),
  startDate: z.string().regex(dateRe).nullish(),
  endDate: z.string().regex(dateRe).nullish(),
  description: z.string().trim().nullish(),
})

// Whole days of tenure from hire_date to today (>= 0), or null when unknown.
function seniorityDays(hireDate: string | null): number | null {
  if (!hireDate) return null
  const ms = Date.now() - new Date(hireDate).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 0
  return Math.floor(ms / 86_400_000)
}

/**
 * GET /employees/:empId/profile — the aggregate My Data view (基本/通訊/學歷證照/
 * 工作經歷/年資). Self-or-HR only; tenant-scoped. Returns null `profile` when the
 * 1:1 row does not exist yet.
 */
employeeProfileRouter.get(
  "/employees/:empId/profile",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const userId = req.auth?.userId
    const empId = req.params.empId as string
    if (!userId) {
      res.status(401).json({ error: "unauthorized" })
      return
    }
    try {
      const auth = await authorize(tenantId, userId, empId)
      if (!auth) {
        res.status(403).json({ error: "forbidden" })
        return
      }

      const [basic, profile, educations, certifications, workHistory] = await Promise.all([
        supabaseAdmin
          .from("employees")
          .select("id, name, emp_no, dept_id, employment_type, hire_date, role, status")
          .eq("tenant_id", tenantId)
          .eq("id", empId)
          .maybeSingle(),
        supabaseAdmin
          .from("employee_profiles")
          .select(
            "id, phone, personal_email, address, emergency_contact, emergency_phone, birthday, gender, marital_status, note, updated_at",
          )
          .eq("tenant_id", tenantId)
          .eq("employee_id", empId)
          .maybeSingle(),
        supabaseAdmin
          .from("employee_educations")
          .select("id, school, major, degree, start_date, end_date")
          .eq("tenant_id", tenantId)
          .eq("employee_id", empId)
          .order("start_date", { ascending: false }),
        supabaseAdmin
          .from("employee_certifications")
          .select("id, name, issuer, issued_date, expiry_date")
          .eq("tenant_id", tenantId)
          .eq("employee_id", empId)
          .order("issued_date", { ascending: false }),
        supabaseAdmin
          .from("employee_work_history")
          .select("id, company, title, start_date, end_date, description")
          .eq("tenant_id", tenantId)
          .eq("employee_id", empId)
          .order("start_date", { ascending: false }),
      ])

      if (!basic.data) {
        res.status(404).json({ error: "not_found" })
        return
      }

      res.status(200).json({
        basic: basic.data,
        profile: profile.data ?? null,
        educations: educations.data ?? [],
        certifications: certifications.data ?? [],
        workHistory: workHistory.data ?? [],
        seniorityDays: seniorityDays((basic.data.hire_date as string | null) ?? null),
      })
    } catch (err) {
      next(err)
    }
  },
)

// PUT /employees/:empId/profile — upsert the 1:1 contact profile (self-or-HR).
employeeProfileRouter.put(
  "/employees/:empId/profile",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const userId = req.auth?.userId
    const empId = req.params.empId as string
    if (!userId) {
      res.status(401).json({ error: "unauthorized" })
      return
    }
    const parsed = profileSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() })
      return
    }
    try {
      const auth = await authorize(tenantId, userId, empId)
      if (!auth) {
        res.status(403).json({ error: "forbidden" })
        return
      }
      const d = parsed.data
      const { data, error } = await supabaseAdmin
        .from("employee_profiles")
        .upsert(
          {
            tenant_id: tenantId,
            employee_id: empId,
            phone: d.phone ?? null,
            personal_email: d.personalEmail ?? null,
            address: d.address ?? null,
            emergency_contact: d.emergencyContact ?? null,
            emergency_phone: d.emergencyPhone ?? null,
            birthday: d.birthday ?? null,
            gender: d.gender ?? null,
            marital_status: d.maritalStatus ?? null,
            note: d.note ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,employee_id" },
        )
        .select("id")
        .single()
      if (error || !data) {
        next(new Error(`PUT /employees/${empId}/profile: ${error?.message}`))
        return
      }
      res.status(200).json({ id: data.id })
    } catch (err) {
      next(err)
    }
  },
)

// Generic factory for the three list-type sub-resources (educations /
// certifications / work-history): POST creates a row for :empId, DELETE removes
// a row by its own id. Both self-or-HR and tenant-scoped.
function listResource<S extends z.ZodTypeAny>(
  segment: string,
  table: string,
  schema: S,
  toRow: (d: z.infer<S>) => Record<string, unknown>,
) {
  employeeProfileRouter.post(
    `/employees/:empId/${segment}`,
    requireAuth,
    requireTenant,
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = res.locals.tenantId as string
      const userId = req.auth?.userId ?? NIL
      const empId = req.params.empId as string
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() })
        return
      }
      try {
        const auth = await authorize(tenantId, userId, empId)
        if (!auth) {
          res.status(403).json({ error: "forbidden" })
          return
        }
        const { data, error } = await supabaseAdmin
          .from(table)
          .insert({ tenant_id: tenantId, employee_id: empId, ...toRow(parsed.data) })
          .select("id")
          .single()
        if (error || !data) {
          next(new Error(`POST /employees/${empId}/${segment}: ${error?.message}`))
          return
        }
        res.status(201).json({ id: data.id })
      } catch (err) {
        next(err)
      }
    },
  )

  employeeProfileRouter.delete(
    `/${segment}/:id`,
    requireAuth,
    requireTenant,
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = res.locals.tenantId as string
      const userId = req.auth?.userId ?? NIL
      const id = req.params.id
      try {
        // Load the row to learn its employee_id, then authorize against it.
        const { data: row, error: rowErr } = await supabaseAdmin
          .from(table)
          .select("id, employee_id")
          .eq("tenant_id", tenantId)
          .eq("id", id)
          .maybeSingle()
        if (rowErr) {
          next(new Error(`DELETE /${segment}/${id} (load): ${rowErr.message}`))
          return
        }
        if (!row) {
          res.status(404).json({ error: "not_found" })
          return
        }
        const auth = await authorize(tenantId, userId, row.employee_id as string)
        if (!auth) {
          res.status(403).json({ error: "forbidden" })
          return
        }
        const { error: delErr } = await supabaseAdmin
          .from(table)
          .delete()
          .eq("tenant_id", tenantId)
          .eq("id", id)
        if (delErr) {
          next(new Error(`DELETE /${segment}/${id}: ${delErr.message}`))
          return
        }
        res.status(200).json({ id })
      } catch (err) {
        next(err)
      }
    },
  )
}

listResource("educations", "employee_educations", educationSchema, (d) => ({
  school: d.school,
  major: d.major ?? null,
  degree: d.degree ?? null,
  start_date: d.startDate ?? null,
  end_date: d.endDate ?? null,
}))

listResource("certifications", "employee_certifications", certificationSchema, (d) => ({
  name: d.name,
  issuer: d.issuer ?? null,
  issued_date: d.issuedDate ?? null,
  expiry_date: d.expiryDate ?? null,
}))

listResource("work-history", "employee_work_history", workHistorySchema, (d) => ({
  company: d.company,
  title: d.title ?? null,
  start_date: d.startDate ?? null,
  end_date: d.endDate ?? null,
  description: d.description ?? null,
}))
