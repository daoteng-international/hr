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
  // 基本資料 (Apollo field-for-field)
  englishName: z.string().trim().nullish(),
  nationality: z.string().trim().nullish(),
  idType: z.string().trim().nullish(),
  idNumber: z.string().trim().nullish(),
  idExpiry: z.string().regex(dateRe).nullish(),
  idType2: z.string().trim().nullish(),
  idNumber2: z.string().trim().nullish(),
  idExpiry2: z.string().regex(dateRe).nullish(),
  idType3: z.string().trim().nullish(),
  idNumber3: z.string().trim().nullish(),
  idExpiry3: z.string().regex(dateRe).nullish(),
  entryDate: z.string().regex(dateRe).nullish(),
  birthday: z.string().regex(dateRe).nullish(),
  gender: z.string().trim().nullish(),
  maritalStatus: z.string().trim().nullish(),
  // 通訊資料
  phone: z.string().trim().nullish(),
  phoneMobile2: z.string().trim().nullish(),
  phoneLandline: z.string().trim().nullish(),
  registeredAddress: z.string().trim().nullish(),
  address: z.string().trim().nullish(),
  companyEmail: z.string().trim().nullish(),
  personalEmail: z.string().trim().nullish(),
  emergencyContact: z.string().trim().nullish(),
  emergencyRelationship: z.string().trim().nullish(),
  emergencyPhone: z.string().trim().nullish(),
  note: z.string().trim().nullish(),
})

const educationSchema = z.object({
  school: z.string().trim().min(1),
  isHighest: z.boolean().optional(),
  majorCategory: z.string().trim().nullish(),
  major: z.string().trim().nullish(),
  degree: z.string().trim().nullish(),
  studyType: z.string().trim().nullish(),
  studyStatus: z.string().trim().nullish(),
  region: z.string().trim().nullish(),
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

// Tenure in years to 1 decimal (Apollo 年資 style, e.g. 1.3), or null.
function seniorityYears(hireDate: string | null): number | null {
  const days = seniorityDays(hireDate)
  if (days == null) return null
  return Math.round((days / 365) * 10) / 10
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

      const [basic, profile, educations, certifications, workHistory, jobHistory] =
        await Promise.all([
        supabaseAdmin
          .from("employees")
          .select("id, name, emp_no, dept_id, employment_type, hire_date, role, status")
          .eq("tenant_id", tenantId)
          .eq("id", empId)
          .maybeSingle(),
        supabaseAdmin
          .from("employee_profiles")
          .select(
            "id, english_name, nationality, id_type, id_number, id_expiry, id_type2, id_number2, id_expiry2, id_type3, id_number3, id_expiry3, entry_date, birthday, gender, marital_status, phone, phone_mobile2, phone_landline, registered_address, address, company_email, personal_email, emergency_contact, emergency_relationship, emergency_phone, note, updated_at",
          )
          .eq("tenant_id", tenantId)
          .eq("employee_id", empId)
          .maybeSingle(),
        supabaseAdmin
          .from("employee_educations")
          .select(
            "id, school, is_highest, major_category, major, degree, study_type, study_status, region, start_date, end_date",
          )
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
        supabaseAdmin
          .from("employee_job_history")
          .select("id, effective_date, action, dept_id, dept_name, grade, title")
          .eq("tenant_id", tenantId)
          .eq("employee_id", empId)
          .order("effective_date", { ascending: false }),
      ])

      if (!basic.data) {
        res.status(404).json({ error: "not_found" })
        return
      }

      const hireDate = (basic.data.hire_date as string | null) ?? null
      // 單位年資: years since the latest dept-changing entry (or hire) — the most
      // recent job-history row with a dept is when the current unit began.
      const unitStart =
        (jobHistory.data ?? []).find((j) => j.dept_id || j.dept_name)?.effective_date ?? hireDate
      res.status(200).json({
        basic: basic.data,
        profile: profile.data ?? null,
        educations: educations.data ?? [],
        certifications: certifications.data ?? [],
        workHistory: workHistory.data ?? [],
        jobHistory: jobHistory.data ?? [],
        seniorityDays: seniorityDays(hireDate),
        seniority: {
          internalYears: seniorityYears(hireDate),
          gradeYears: null,
          unitYears: seniorityYears((unitStart as string | null) ?? null),
        },
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
      // Partial semantics: a key absent from the body (undefined) is left
      // untouched; an explicit null clears the column. Prevents a tab that only
      // edits 通訊資料 from wiping the 基本資料 fields (and vice versa).
      const FIELD_TO_COL: Record<string, string> = {
        englishName: "english_name",
        nationality: "nationality",
        idType: "id_type",
        idNumber: "id_number",
        idExpiry: "id_expiry",
        idType2: "id_type2",
        idNumber2: "id_number2",
        idExpiry2: "id_expiry2",
        idType3: "id_type3",
        idNumber3: "id_number3",
        idExpiry3: "id_expiry3",
        entryDate: "entry_date",
        birthday: "birthday",
        gender: "gender",
        maritalStatus: "marital_status",
        phone: "phone",
        phoneMobile2: "phone_mobile2",
        phoneLandline: "phone_landline",
        registeredAddress: "registered_address",
        address: "address",
        companyEmail: "company_email",
        personalEmail: "personal_email",
        emergencyContact: "emergency_contact",
        emergencyRelationship: "emergency_relationship",
        emergencyPhone: "emergency_phone",
        note: "note",
      }
      const row: Record<string, unknown> = {
        tenant_id: tenantId,
        employee_id: empId,
        updated_at: new Date().toISOString(),
      }
      for (const [field, col] of Object.entries(FIELD_TO_COL)) {
        const v = (d as Record<string, unknown>)[field]
        if (v !== undefined) row[col] = v
      }
      const { data, error } = await supabaseAdmin
        .from("employee_profiles")
        .upsert(row, { onConflict: "tenant_id,employee_id" })
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
  is_highest: d.isHighest ?? false,
  major_category: d.majorCategory ?? null,
  major: d.major ?? null,
  degree: d.degree ?? null,
  study_type: d.studyType ?? null,
  study_status: d.studyStatus ?? null,
  region: d.region ?? null,
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

/**
 * POST /employees/:empId/job-history — HR records a 職務經歷 entry (新進/晉升/
 * 調部門/資料調整…). HR-only (unlike the self-editable lists above): employees
 * read their history via the profile aggregate but cannot rewrite it.
 */
const jobHistorySchema = z.object({
  effectiveDate: z.string().regex(dateRe),
  action: z.string().trim().min(1),
  deptId: z.string().uuid().nullish(),
  deptName: z.string().trim().nullish(),
  grade: z.string().trim().nullish(),
  title: z.string().trim().nullish(),
})

employeeProfileRouter.post(
  "/employees/:empId/job-history",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const userId = req.auth?.userId ?? NIL
    const empId = req.params.empId as string
    const parsed = jobHistorySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() })
      return
    }
    try {
      const auth = await authorize(tenantId, userId, empId)
      if (!auth || !auth.isHr) {
        res.status(403).json({ error: "forbidden" })
        return
      }
      const d = parsed.data
      const { data, error } = await supabaseAdmin
        .from("employee_job_history")
        .insert({
          tenant_id: tenantId,
          employee_id: empId,
          effective_date: d.effectiveDate,
          action: d.action,
          dept_id: d.deptId ?? null,
          dept_name: d.deptName ?? null,
          grade: d.grade ?? null,
          title: d.title ?? null,
        })
        .select("id")
        .single()
      if (error || !data) {
        next(new Error(`POST /employees/${empId}/job-history: ${error?.message}`))
        return
      }
      res.status(201).json({ id: data.id })
    } catch (err) {
      next(err)
    }
  },
)
