import { Router, type Request, type Response, type NextFunction } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { requireTenant } from "../middleware/tenant.js"
import { requireHrAdmin } from "../middleware/role.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const departmentsRouter = Router()

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  parentId: z.string().uuid().nullish(),
  managerEmpId: z.string().uuid().nullish(),
})

// PATCH allows any subset; at least one field must be present.
const updateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    parentId: z.string().uuid().nullable().optional(),
    managerEmpId: z.string().uuid().nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "no fields to update" })

/**
 * All department routes are HR-admin-only and tenant-scoped. The tenant boundary
 * is the load-bearing guard: every query is forced to res.locals.tenantId (from
 * the JWT) so an HR admin can only ever touch their own tenant's departments,
 * even though supabaseAdmin bypasses RLS.
 */

// GET /departments — list this tenant's departments.
departmentsRouter.get(
  "/departments",
  requireAuth,
  requireTenant,
  requireHrAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    try {
      const { data, error } = await supabaseAdmin
        .from("departments")
        .select("id, tenant_id, parent_id, name, manager_emp_id, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true })

      if (error) {
        next(new Error(`GET /departments: ${error.message}`))
        return
      }
      res.status(200).json({ departments: data ?? [] })
    } catch (err) {
      next(err)
    }
  },
)

// POST /departments — create a department under this tenant.
departmentsRouter.post(
  "/departments",
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
    try {
      const { data, error } = await supabaseAdmin
        .from("departments")
        .insert({
          tenant_id: tenantId,
          name: parsed.data.name,
          parent_id: parsed.data.parentId ?? null,
          manager_emp_id: parsed.data.managerEmpId ?? null,
        })
        .select("id")
        .single()

      if (error || !data) {
        next(new Error(`POST /departments: ${error?.message}`))
        return
      }
      res.status(201).json({ id: data.id })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /departments/:id — update name/parentId/managerEmpId (this tenant only).
departmentsRouter.patch(
  "/departments/:id",
  requireAuth,
  requireTenant,
  requireHrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const { id } = req.params
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() })
      return
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.parentId !== undefined) patch.parent_id = parsed.data.parentId
    if (parsed.data.managerEmpId !== undefined) patch.manager_emp_id = parsed.data.managerEmpId

    try {
      const { data, error } = await supabaseAdmin
        .from("departments")
        .update(patch)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("id")
        .maybeSingle()

      if (error) {
        next(new Error(`PATCH /departments/${id}: ${error.message}`))
        return
      }
      // No row matched → not in this tenant (or doesn't exist) → 404.
      if (!data) {
        res.status(404).json({ error: "not_found" })
        return
      }
      res.status(200).json({ id: data.id })
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /departments/:id — remove a department (this tenant only); 409 if any
// employee still references it via dept_id.
departmentsRouter.delete(
  "/departments/:id",
  requireAuth,
  requireTenant,
  requireHrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const { id } = req.params
    try {
      // Guard: block deletion while employees are still assigned to this dept.
      const { count, error: countErr } = await supabaseAdmin
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("dept_id", id)

      if (countErr) {
        next(new Error(`DELETE /departments/${id} (count): ${countErr.message}`))
        return
      }
      if ((count ?? 0) > 0) {
        res.status(409).json({ error: "department_has_employees" })
        return
      }

      const { data, error } = await supabaseAdmin
        .from("departments")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("id")
        .maybeSingle()

      if (error) {
        next(new Error(`DELETE /departments/${id}: ${error.message}`))
        return
      }
      if (!data) {
        res.status(404).json({ error: "not_found" })
        return
      }
      res.status(200).json({ id: data.id })
    } catch (err) {
      next(err)
    }
  },
)
