import { Router, type Request, type Response, type NextFunction } from "express"
import { requireAuth } from "../middleware/auth.js"
import { requireTenant } from "../middleware/tenant.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const tenantRouter = Router()

/**
 * GET /api/tenant/branding — white-label config for the caller's own tenant.
 * Returns { branding, features }. Tenant is resolved from the JWT, so a user
 * can only ever read their own tenant's branding.
 */
tenantRouter.get(
  "/api/tenant/branding",
  requireAuth,
  requireTenant,
  async (_req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    try {
      const { data, error } = await supabaseAdmin
        .from("tenants")
        .select("branding, features")
        .eq("id", tenantId)
        .single()

      if (error || !data) {
        res.status(404).json({ error: "tenant_not_found" })
        return
      }
      res.status(200).json({ branding: data.branding, features: data.features })
    } catch (err) {
      next(err)
    }
  },
)
