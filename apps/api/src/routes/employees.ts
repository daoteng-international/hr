import { Router, type Request, type Response, type NextFunction } from "express"
import { requireAuth } from "../middleware/auth.js"
import { requireTenant } from "../middleware/tenant.js"
import { requireHrAdmin } from "../middleware/role.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const employeesRouter = Router()

/**
 * GET /employees — list the calling HR admin's own-tenant employees.
 *
 * Tenant boundary is enforced TWICE: the API filters by res.locals.tenantId
 * (derived from the JWT) here, and DB RLS enforces it again at the row level
 * for any non-service_role access. This handler uses supabaseAdmin which
 * bypasses RLS, so the explicit tenant_id filter is the load-bearing guard.
 */
employeesRouter.get(
  "/employees",
  requireAuth,
  requireTenant,
  requireHrAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    try {
      const { data, error } = await supabaseAdmin
        .from("employees")
        .select("id, tenant_id, user_id, name, role, employment_type, status, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true })

      if (error) {
        next(new Error(`GET /employees: ${error.message}`))
        return
      }
      res.status(200).json({ employees: data ?? [] })
    } catch (err) {
      next(err)
    }
  },
)
