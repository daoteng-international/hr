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

export interface Me {
  id: string;
  name: string;
  role: string;
  deptId: string | null;
  empNo: string | null;
  status: string;
  email: string | null;
}

/** The caller's own employee profile; used to detect HR admins in the ESS. */
export function getMe() {
  return apiFetch<Me>("/me");
}

const ADMIN_ROLES = ["hr_admin", "platform_admin"];

export function isAdminRole(role: string | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
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
export type RequestKind = "leave" | "ot" | "fix_punch" | "business_trip";

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
/* ------------------------------------------------------- my data / 履歷 --- */

export interface EmployeeProfile {
  phone: string | null;
  personal_email: string | null;
  address: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  birthday: string | null;
  gender: string | null;
  marital_status: string | null;
  note: string | null;
}

export interface Education {
  id: string;
  school: string;
  major: string | null;
  degree: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  issued_date: string | null;
  expiry_date: string | null;
}

export interface WorkHistory {
  id: string;
  company: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

export interface ProfileAggregate {
  basic: {
    id: string;
    name: string;
    emp_no: string | null;
    dept_id: string | null;
    employment_type: string;
    hire_date: string | null;
    role: string;
    status: string;
  };
  profile: EmployeeProfile | null;
  educations: Education[];
  certifications: Certification[];
  workHistory: WorkHistory[];
  seniorityDays: number | null;
}

export function getProfile(empId: string) {
  return apiFetch<ProfileAggregate>(`/employees/${empId}/profile`);
}

export function saveProfile(empId: string, body: Partial<EmployeeProfile>) {
  return apiFetch<{ id: string }>(`/employees/${empId}/profile`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function addEducation(
  empId: string,
  body: { school: string; major?: string; degree?: string; startDate?: string; endDate?: string },
) {
  return apiFetch<{ id: string }>(`/employees/${empId}/educations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function addCertification(
  empId: string,
  body: { name: string; issuer?: string; issuedDate?: string; expiryDate?: string },
) {
  return apiFetch<{ id: string }>(`/employees/${empId}/certifications`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function addWorkHistory(
  empId: string,
  body: { company: string; title?: string; startDate?: string; endDate?: string; description?: string },
) {
  return apiFetch<{ id: string }>(`/employees/${empId}/work-history`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteEducation(id: string) {
  return apiFetch<{ id: string }>(`/educations/${id}`, { method: "DELETE" });
}

export function deleteCertification(id: string) {
  return apiFetch<{ id: string }>(`/certifications/${id}`, { method: "DELETE" });
}

export function deleteWorkHistory(id: string) {
  return apiFetch<{ id: string }>(`/work-history/${id}`, { method: "DELETE" });
}

export function getLeaveTypes() {
  return apiFetch<{ leaveTypes: LeaveType[] }>("/leave-types");
}
