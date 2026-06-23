/**
 * Typed ESS API calls. Shapes mirror the @hr/api responses exactly
 * (see apps/api/src/routes/{tenant,punch,announcements,requests,leave-types}.ts).
 */
import { apiFetch } from "./api-client";

export interface Branding {
  primaryColor?: string;
  appName?: string;
  logoUrl?: string;
}

export interface BrandingResponse {
  branding: Branding | null;
  features: Record<string, unknown> | null;
}

export interface PunchRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  punch_at: string;
  type: "in" | "out";
  source: string | null;
  lat: number | null;
  lng: number | null;
  device_id: string | null;
}

export interface PunchTodayResponse {
  records: PunchRecord[];
  status: "working" | "off";
}

export interface PunchResult {
  id: string;
  type: "in" | "out";
  punchAt: string;
}

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  audience: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type RequestKind = "leave" | "ot" | "fix_punch";

export interface LeaveRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  kind: RequestKind;
  leave_type_id: string | null;
  start_at: string;
  end_at: string;
  hours: number | null;
  reason: string | null;
  status: RequestStatus;
  current_step: number;
  created_at: string;
}

export interface LeaveType {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  paid: boolean;
  created_at: string;
}

export interface CreateRequestBody {
  kind: RequestKind;
  leaveTypeId?: string;
  startAt: string;
  endAt: string;
  hours?: number;
  reason?: string;
}

export function getBranding() {
  return apiFetch<BrandingResponse>("/api/tenant/branding");
}

export function getPunchToday() {
  return apiFetch<PunchTodayResponse>("/punch/today");
}

export function postPunch(body: {
  type?: "in" | "out";
  source?: "gps" | "web";
  lat?: number;
  lng?: number;
}) {
  return apiFetch<PunchResult>("/punch", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getAnnouncements() {
  return apiFetch<{ announcements: Announcement[] }>("/announcements");
}

export function getRequests(status?: RequestStatus) {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<{ requests: LeaveRequest[] }>(`/requests${qs}`);
}

export function createRequest(body: CreateRequestBody) {
  return apiFetch<{ requestId: string }>("/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function cancelRequest(id: string) {
  return apiFetch<{ status: RequestStatus }>(`/requests/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Leave types. NOTE: GET /leave-types is HR-admin-only on the API, so a plain
 * employee receives 403 — callers should treat a rejection as "no list
 * available" and fall back to a free-text / optional leave type.
 */
export function getLeaveTypes() {
  return apiFetch<{ leaveTypes: LeaveType[] }>("/leave-types");
}
