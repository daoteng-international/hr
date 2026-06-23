import { Router, type Request, type Response, type NextFunction } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { requireTenant } from "../middleware/tenant.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const requestsRouter = Router()

const KINDS = ["leave", "ot", "fix_punch"] as const

const createSchema = z.object({
  kind: z.enum(KINDS),
  leaveTypeId: z.string().uuid().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  hours: z.number().optional(),
  reason: z.string().trim().min(1).optional(),
})

const decisionSchema = z.object({
  comment: z.string().trim().min(1).optional(),
})

const querySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
})

const REQUEST_COLS =
  "id, tenant_id, employee_id, kind, leave_type_id, start_at, end_at, hours, reason, status, current_step, created_at"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

// Resolve the caller's own employee row (id + role) in this tenant, or null.
async function resolveSelf(
  tenantId: string,
  userId: string,
): Promise<{ id: string; role: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`resolve self employee: ${error.message}`)
  return data ? { id: data.id as string, role: data.role as string } : null
}

function isHrRole(role: string | undefined): boolean {
  return !!role && ["hr_admin", "platform_admin"].includes(role)
}

/**
 * POST /requests — the authenticated employee files a request for THEMSELVES.
 *
 * The employee_id is always derived from the token (anti-spoofing); any
 * employeeId in the body is ignored. The approval chain is materialised from the
 * tenant's approval_flow for this kind: if it has approver ids we create one
 * approval_steps row per id in order; if it's missing/empty we fall back to a
 * single step approved by any hr_admin in the tenant. The request starts
 * status='pending', current_step=1.
 */
requestsRouter.post(
  "/requests",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json({ error: "unauthorized" })
      return
    }

    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() })
      return
    }
    const { kind, leaveTypeId, startAt, endAt, hours, reason } = parsed.data

    try {
      const self = await resolveSelf(tenantId, userId)
      if (!self) {
        res.status(403).json({ error: "not_an_employee" })
        return
      }

      // Resolve the approver chain for this kind.
      const { data: flow, error: flowErr } = await supabaseAdmin
        .from("approval_flows")
        .select("approver_emp_ids")
        .eq("tenant_id", tenantId)
        .eq("applies_to", kind)
        .maybeSingle()
      if (flowErr) {
        next(new Error(`POST /requests (flow): ${flowErr.message}`))
        return
      }

      let approverIds: string[] = Array.isArray(flow?.approver_emp_ids)
        ? (flow!.approver_emp_ids as string[])
        : []

      // No configured flow → fall back to a single step approved by any HR admin.
      if (approverIds.length === 0) {
        const { data: hr, error: hrErr } = await supabaseAdmin
          .from("employees")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("role", "hr_admin")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
        if (hrErr) {
          next(new Error(`POST /requests (fallback hr): ${hrErr.message}`))
          return
        }
        if (!hr) {
          // No approver can be determined — refuse rather than create a request
          // nobody can ever action.
          res.status(409).json({ error: "no_approver_available" })
          return
        }
        approverIds = [hr.id as string]
      }

      // Create the request (pending, step 1).
      const { data: created, error: reqErr } = await supabaseAdmin
        .from("leave_requests")
        .insert({
          tenant_id: tenantId,
          employee_id: self.id,
          kind,
          leave_type_id: leaveTypeId ?? null,
          start_at: startAt,
          end_at: endAt,
          hours: hours ?? null,
          reason: reason ?? null,
          status: "pending",
          current_step: 1,
        })
        .select("id")
        .single()
      if (reqErr || !created) {
        next(new Error(`POST /requests (insert): ${reqErr?.message}`))
        return
      }
      const requestId = created.id as string

      // Materialise the ordered approval steps.
      const stepRows = approverIds.map((approverEmpId, i) => ({
        tenant_id: tenantId,
        request_id: requestId,
        step_order: i + 1,
        approver_emp_id: approverEmpId,
        decision: "pending",
      }))
      const { data: steps, error: stepErr } = await supabaseAdmin
        .from("approval_steps")
        .insert(stepRows)
        .select("step_order, approver_emp_id")
        .order("step_order", { ascending: true })
      if (stepErr || !steps) {
        // Best-effort cleanup so we don't leave a request with no chain.
        await supabaseAdmin.from("leave_requests").delete().eq("id", requestId)
        next(new Error(`POST /requests (steps): ${stepErr?.message}`))
        return
      }

      res.status(201).json({
        requestId,
        steps: steps.map((s) => ({
          stepOrder: s.step_order,
          approverEmpId: s.approver_emp_id,
        })),
      })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * GET /requests?status= — list requests visible to the caller.
 *
 * Role-based scoping (on top of the always-on tenant filter):
 *   • HR admin / platform admin → the whole tenant.
 *   • Any other role → the union of "requests I filed" and "requests where it is
 *     currently my turn to approve" (a pending request whose current_step's
 *     approver is me).
 * Optional ?status= narrows by request status.
 */
requestsRouter.get(
  "/requests",
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
    const { status } = parsed.data

    try {
      const self = await resolveSelf(tenantId, userId)
      const isHr = isHrRole(self?.role)

      if (isHr) {
        let query = supabaseAdmin
          .from("leave_requests")
          .select(REQUEST_COLS)
          .eq("tenant_id", tenantId)
        if (status) query = query.eq("status", status)
        const { data, error } = await query.order("created_at", { ascending: false })
        if (error) {
          next(new Error(`GET /requests (hr): ${error.message}`))
          return
        }
        res.status(200).json({ requests: data ?? [] })
        return
      }

      // Non-HR: own requests ∪ requests currently awaiting my approval.
      const selfId = self?.id ?? NIL_UUID

      // (a) Steps where I am the approver → which requests, at which step.
      const { data: mySteps, error: stepErr } = await supabaseAdmin
        .from("approval_steps")
        .select("request_id, step_order")
        .eq("tenant_id", tenantId)
        .eq("approver_emp_id", selfId)
      if (stepErr) {
        next(new Error(`GET /requests (steps): ${stepErr.message}`))
        return
      }
      const stepByRequest = new Map<string, Set<number>>()
      for (const s of mySteps ?? []) {
        const set = stepByRequest.get(s.request_id) ?? new Set<number>()
        set.add(s.step_order as number)
        stepByRequest.set(s.request_id, set)
      }

      // (b) Pull my own requests + any request I have a step on, then filter.
      const candidateIds = Array.from(stepByRequest.keys())
      const orParts = [`employee_id.eq.${selfId}`]
      if (candidateIds.length > 0) {
        orParts.push(`id.in.(${candidateIds.join(",")})`)
      }

      let query = supabaseAdmin
        .from("leave_requests")
        .select(REQUEST_COLS)
        .eq("tenant_id", tenantId)
        .or(orParts.join(","))
      if (status) query = query.eq("status", status)
      const { data, error } = await query.order("created_at", { ascending: false })
      if (error) {
        next(new Error(`GET /requests (self): ${error.message}`))
        return
      }

      // Keep: my own requests, OR a pending request where my step == current_step.
      const visible = (data ?? []).filter((r) => {
        if (r.employee_id === selfId) return true
        if (r.status !== "pending") return false
        const myStepOrders = stepByRequest.get(r.id)
        return !!myStepOrders && myStepOrders.has(r.current_step as number)
      })

      res.status(200).json({ requests: visible })
    } catch (err) {
      next(err)
    }
  },
)

// Shared decision handler for approve/reject.
async function decide(
  action: "approve" | "reject",
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = res.locals.tenantId as string
  const userId = req.auth?.userId
  if (!userId) {
    res.status(401).json({ error: "unauthorized" })
    return
  }
  const requestId = req.params.id
  const parsed = decisionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() })
    return
  }
  const { comment } = parsed.data

  try {
    const self = await resolveSelf(tenantId, userId)
    if (!self) {
      res.status(403).json({ error: "not_an_employee" })
      return
    }

    // Load the request (tenant-scoped).
    const { data: lr, error: lrErr } = await supabaseAdmin
      .from("leave_requests")
      .select("id, status, current_step")
      .eq("tenant_id", tenantId)
      .eq("id", requestId)
      .maybeSingle()
    if (lrErr) {
      next(new Error(`POST /requests/${requestId}/${action} (load): ${lrErr.message}`))
      return
    }
    if (!lr) {
      res.status(404).json({ error: "not_found" })
      return
    }
    if (lr.status !== "pending") {
      res.status(409).json({ error: "not_pending" })
      return
    }

    // Find the current step and verify the caller is its approver.
    const { data: step, error: stepErr } = await supabaseAdmin
      .from("approval_steps")
      .select("id, approver_emp_id, step_order")
      .eq("tenant_id", tenantId)
      .eq("request_id", requestId)
      .eq("step_order", lr.current_step)
      .maybeSingle()
    if (stepErr) {
      next(new Error(`POST /requests/${requestId}/${action} (step): ${stepErr.message}`))
      return
    }
    if (!step || step.approver_emp_id !== self.id) {
      // Not the current approver (or no such step) → forbidden.
      res.status(403).json({ error: "not_current_approver" })
      return
    }

    const actedAt = new Date().toISOString()

    if (action === "reject") {
      const { error: upStepErr } = await supabaseAdmin
        .from("approval_steps")
        .update({ decision: "rejected", comment: comment ?? null, acted_at: actedAt })
        .eq("id", step.id)
      if (upStepErr) {
        next(new Error(`POST /requests/${requestId}/reject (step): ${upStepErr.message}`))
        return
      }
      const { error: upReqErr } = await supabaseAdmin
        .from("leave_requests")
        .update({ status: "rejected" })
        .eq("id", requestId)
      if (upReqErr) {
        next(new Error(`POST /requests/${requestId}/reject (request): ${upReqErr.message}`))
        return
      }
      res.status(200).json({ status: "rejected", currentStep: lr.current_step })
      return
    }

    // approve: mark this step approved.
    const { error: upStepErr } = await supabaseAdmin
      .from("approval_steps")
      .update({ decision: "approved", comment: comment ?? null, acted_at: actedAt })
      .eq("id", step.id)
    if (upStepErr) {
      next(new Error(`POST /requests/${requestId}/approve (step): ${upStepErr.message}`))
      return
    }

    // Is there a next step?
    const { count, error: cntErr } = await supabaseAdmin
      .from("approval_steps")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("request_id", requestId)
      .gt("step_order", lr.current_step)
    if (cntErr) {
      next(new Error(`POST /requests/${requestId}/approve (next): ${cntErr.message}`))
      return
    }

    if ((count ?? 0) > 0) {
      // Advance to the next step; request stays pending.
      const nextStep = (lr.current_step as number) + 1
      const { error: upReqErr } = await supabaseAdmin
        .from("leave_requests")
        .update({ current_step: nextStep })
        .eq("id", requestId)
      if (upReqErr) {
        next(new Error(`POST /requests/${requestId}/approve (advance): ${upReqErr.message}`))
        return
      }
      res.status(200).json({ status: "pending", currentStep: nextStep })
      return
    }

    // Last step approved → request approved.
    const { error: upReqErr } = await supabaseAdmin
      .from("leave_requests")
      .update({ status: "approved" })
      .eq("id", requestId)
    if (upReqErr) {
      next(new Error(`POST /requests/${requestId}/approve (final): ${upReqErr.message}`))
      return
    }
    res.status(200).json({ status: "approved", currentStep: lr.current_step })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /requests/:id/approve — the current step's approver approves. Advances to
 * the next step (still pending) or, if it was the last step, marks the request
 * approved. 403 unless the caller is the current step's approver; 409 unless the
 * request is pending.
 */
requestsRouter.post(
  "/requests/:id/approve",
  requireAuth,
  requireTenant,
  (req: Request, res: Response, next: NextFunction) => decide("approve", req, res, next),
)

/**
 * POST /requests/:id/reject — the current step's approver rejects, immediately
 * ending the request (status='rejected'). Same 403/409 guards as approve.
 */
requestsRouter.post(
  "/requests/:id/reject",
  requireAuth,
  requireTenant,
  (req: Request, res: Response, next: NextFunction) => decide("reject", req, res, next),
)

/**
 * POST /requests/:id/cancel — the filer cancels their own still-pending request
 * (status='cancelled'). 403 if the caller is not the filer; 409 if not pending.
 */
requestsRouter.post(
  "/requests/:id/cancel",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = res.locals.tenantId as string
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json({ error: "unauthorized" })
      return
    }
    const requestId = req.params.id

    try {
      const self = await resolveSelf(tenantId, userId)
      if (!self) {
        res.status(403).json({ error: "not_an_employee" })
        return
      }

      const { data: lr, error: lrErr } = await supabaseAdmin
        .from("leave_requests")
        .select("id, employee_id, status")
        .eq("tenant_id", tenantId)
        .eq("id", requestId)
        .maybeSingle()
      if (lrErr) {
        next(new Error(`POST /requests/${requestId}/cancel (load): ${lrErr.message}`))
        return
      }
      if (!lr) {
        res.status(404).json({ error: "not_found" })
        return
      }
      // Only the filer may cancel.
      if (lr.employee_id !== self.id) {
        res.status(403).json({ error: "not_the_filer" })
        return
      }
      if (lr.status !== "pending") {
        res.status(409).json({ error: "not_pending" })
        return
      }

      const { error: upErr } = await supabaseAdmin
        .from("leave_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId)
      if (upErr) {
        next(new Error(`POST /requests/${requestId}/cancel (update): ${upErr.message}`))
        return
      }
      res.status(200).json({ status: "cancelled" })
    } catch (err) {
      next(err)
    }
  },
)
