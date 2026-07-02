/**
 * Typed HR-admin (back-office) API calls. Shapes mirror the @hr/api responses
 * exactly (see apps/api/src/routes/{me,departments,employees,shifts,schedules,
 * requests,announcements,leave-types,approval-flows}.ts).
 *
 * All calls go through apiFetch, which attaches the current Supabase access
 * token as a Bearer header. Every endpoint here is HR-admin-only on the API
 * (except GET /me, GET /announcements and GET /leave-types, which any tenant
 * member may read) and is tenant-scoped server-side.
 */
import { apiFetch } from "./api-client";

/* ------------------------------------------------------------------ me ----- */

export type Role = "platform_admin" | "hr_admin" | "employee" | string;

export interface Me {
  id: string;
  name: string;
  role: Role;
  deptId: string | null;
  empNo: string | null;
  status: string;
  email: string | null;
}

export function getMe() {
  return apiFetch<Me>("/me");
}

/* --------------------------------------------------------- departments ----- */

export interface Department {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  name: string;
  manager_emp_id: string | null;
  created_at: string;
}

export function getDepartments() {
  return apiFetch<{ departments: Department[] }>("/departments");
}

export function createDepartment(body: {
  name: string;
  parentId?: string | null;
  managerEmpId?: string | null;
}) {
  return apiFetch<{ id: string }>("/departments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateDepartment(
  id: string,
  body: { name?: string; parentId?: string | null; managerEmpId?: string | null },
) {
  return apiFetch<{ id: string }>(`/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteDepartment(id: string) {
  return apiFetch<{ id: string }>(`/departments/${id}`, { method: "DELETE" });
}

/* ----------------------------------------------------------- employees ----- */

export interface Employee {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  role: string;
  employment_type: string | null;
  status: string;
  created_at: string;
}

export function getEmployees() {
  return apiFetch<{ employees: Employee[] }>("/employees");
}

/** Invite an employee: creates their Supabase Auth user + employees row. */
export function inviteEmployee(body: {
  email: string;
  name: string;
  password: string;
  role?: string;
  deptId?: string | null;
  empNo?: string;
  employmentType?: string;
}) {
  return apiFetch<{ employeeId: string; userId: string }>("/employees", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateEmployee(
  id: string,
  body: {
    name?: string;
    role?: string;
    status?: string;
    deptId?: string | null;
    empNo?: string | null;
    employmentType?: string;
  },
) {
  return apiFetch<{ id: string }>(`/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deactivateEmployee(id: string) {
  return apiFetch<{ id: string; status: string }>(`/employees/${id}/deactivate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/* -------------------------------------------------------------- shifts ----- */

export interface Shift {
  id: string;
  tenant_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_night_shift: boolean;
  created_at: string;
}

export function getShifts() {
  return apiFetch<{ shifts: Shift[] }>("/shifts");
}

export function createShift(body: {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  isNightShift?: boolean;
}) {
  return apiFetch<{ id: string }>("/shifts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateShift(
  id: string,
  body: {
    name?: string;
    startTime?: string;
    endTime?: string;
    breakMinutes?: number;
    isNightShift?: boolean;
  },
) {
  return apiFetch<{ id: string }>(`/shifts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteShift(id: string) {
  return apiFetch<{ id: string }>(`/shifts/${id}`, { method: "DELETE" });
}

/* ----------------------------------------------------------- schedules ----- */

export interface Schedule {
  id: string;
  tenant_id: string;
  employee_id: string;
  work_date: string;
  shift_id: string | null;
  status: string;
  created_at: string;
}

export function getSchedules(params: { employeeId?: string; from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.employeeId) qs.set("employeeId", params.employeeId);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<{ schedules: Schedule[] }>(`/schedules${suffix}`);
}

export function assignSchedule(body: {
  employeeId: string;
  workDate: string;
  shiftId?: string | null;
  status?: string;
}) {
  return apiFetch<{ ids: string[]; count: number }>("/schedules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ------------------------------------------------------------ requests ----- */

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

export function getRequests(status?: RequestStatus) {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<{ requests: LeaveRequest[] }>(`/requests${qs}`);
}

export function approveRequest(id: string, comment?: string) {
  return apiFetch<{ status: RequestStatus; currentStep: number }>(`/requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

export function rejectRequest(id: string, comment?: string) {
  return apiFetch<{ status: RequestStatus; currentStep: number }>(`/requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

/* ------------------------------------------------------- announcements ----- */

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

export function getAnnouncements() {
  return apiFetch<{ announcements: Announcement[] }>("/announcements");
}

export function createAnnouncement(body: { title: string; body: string; audience?: string }) {
  return apiFetch<{ id: string }>("/announcements", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAnnouncement(
  id: string,
  body: { title?: string; body?: string; audience?: string },
) {
  return apiFetch<{ id: string }>(`/announcements/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAnnouncement(id: string) {
  return apiFetch<{ id: string }>(`/announcements/${id}`, { method: "DELETE" });
}

/* --------------------------------------------------------- leave-types ----- */

export interface LeaveType {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  paid: boolean;
  special: boolean;
  created_at: string;
}

export function getLeaveTypes() {
  return apiFetch<{ leaveTypes: LeaveType[] }>("/leave-types");
}

export function createLeaveType(body: {
  code: string;
  name: string;
  paid?: boolean;
  special?: boolean;
}) {
  return apiFetch<{ id: string }>("/leave-types", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateLeaveType(
  id: string,
  body: { code?: string; name?: string; paid?: boolean; special?: boolean },
) {
  return apiFetch<{ id: string }>(`/leave-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteLeaveType(id: string) {
  return apiFetch<{ id: string }>(`/leave-types/${id}`, { method: "DELETE" });
}

/* ------------------------------------------------------------- org-chart --- */

export interface OrgNode {
  id: string;
  name: string;
  managerEmpId: string | null;
  children: OrgNode[];
}

export function getOrgChart() {
  return apiFetch<{ tree: OrgNode[] }>("/org-chart");
}

/* ------------------------------------------------------------ onboarding --- */

export interface Onboarding {
  id: string;
  tenant_id: string;
  name: string;
  dept_id: string | null;
  manager_emp_id: string | null;
  employment_type: string;
  identity_type: string | null;
  region: string | null;
  report_date: string | null;
  status: "pending" | "completed";
  employee_id: string | null;
  created_at: string;
}

export function getOnboardings(filters?: {
  status?: "pending" | "completed";
  from?: string;
  to?: string;
  keyword?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.keyword) params.set("keyword", filters.keyword);
  const qs = params.toString();
  return apiFetch<{ onboardings: Onboarding[] }>(`/onboardings${qs ? `?${qs}` : ""}`);
}

export function importOnboardings(csv: string) {
  return apiFetch<{ count: number; errors: { line: number; error: string }[] }>(
    "/onboardings/import",
    { method: "POST", body: JSON.stringify({ csv }) },
  );
}

export function createOnboarding(body: {
  name: string;
  deptId?: string | null;
  identityType?: string | null;
  region?: string | null;
  reportDate?: string | null;
}) {
  return apiFetch<{ id: string }>("/onboardings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function completeOnboarding(id: string) {
  return apiFetch<{ id: string; status: string; employeeId: string }>(
    `/onboardings/${id}/complete`,
    { method: "POST" },
  );
}

export function deleteOnboarding(id: string) {
  return apiFetch<{ id: string }>(`/onboardings/${id}`, { method: "DELETE" });
}

/* ----------------------------------------------------- recruitment (ATS) --- */

export interface JobRequisition {
  id: string;
  tenant_id: string;
  title: string;
  dept_id: string | null;
  headcount: number;
  employment_type: string;
  description: string | null;
  status: "draft" | "open" | "closed";
  is_internal: boolean;
  created_at: string;
}

export interface Candidate {
  id: string;
  tenant_id: string;
  requisition_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: "new" | "screening" | "interviewing" | "offered" | "hired" | "rejected";
  note: string | null;
  created_at: string;
}

export function getJobRequisitions() {
  return apiFetch<{ "job-requisitions": JobRequisition[] }>("/job-requisitions");
}

export function createJobRequisition(body: {
  title: string;
  headcount?: number;
  isInternal?: boolean;
  status?: "draft" | "open" | "closed";
  description?: string;
}) {
  return apiFetch<{ id: string }>("/job-requisitions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateJobRequisition(
  id: string,
  body: { status?: "draft" | "open" | "closed"; isInternal?: boolean },
) {
  return apiFetch<{ id: string }>(`/job-requisitions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteJobRequisition(id: string) {
  return apiFetch<{ id: string }>(`/job-requisitions/${id}`, { method: "DELETE" });
}

export function getCandidates(requisitionId?: string) {
  const qs = requisitionId ? `?requisitionId=${requisitionId}` : "";
  return apiFetch<{ candidates: Candidate[] }>(`/candidates${qs}`);
}

export function createCandidate(body: {
  name: string;
  email?: string;
  phone?: string;
  requisitionId?: string | null;
  source?: string;
}) {
  return apiFetch<{ id: string }>("/candidates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCandidate(
  id: string,
  body: { status?: Candidate["status"]; note?: string },
) {
  return apiFetch<{ id: string }>(`/candidates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/* ------------------------------------------------- payroll tax / 法規 --- */

export interface NonEmployeeIncome {
  id: string;
  payee_name: string;
  income_type: string | null;
  amount: string;
  tax_withheld: string;
  supplementary_premium: string;
  pay_date: string | null;
  created_at: string;
}

export function importSalaryAdjustments(csv: string) {
  return apiFetch<{ count: number; errors: { line: number; error: string }[] }>(
    "/salary-adjustments/import",
    { method: "POST", body: JSON.stringify({ csv }) },
  );
}

export function getNonEmployeeIncome() {
  return apiFetch<{ "non-employee-income": NonEmployeeIncome[] }>("/non-employee-income");
}

export function createNonEmployeeIncome(body: {
  payeeName: string;
  incomeType?: string;
  amount: number;
  withholdRate?: number;
  payDate?: string;
}) {
  return apiFetch<{ id: string; taxWithheld: number; supplementaryPremium: number }>(
    "/non-employee-income",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export type TaxComputeBody =
  | { kind: "bonus_premium"; monthlyInsuredSalary: number; cumulativeBonusBefore?: number; thisBonus: number; rate?: number }
  | { kind: "nhi_premium"; insuredSalary: number; dependents?: number; rate: number; employeeShareRatio: number }
  | { kind: "withholding"; monthlyPayment: number; rate?: number; threshold?: number };

export function computeTax(body: TaxComputeBody) {
  return apiFetch<{ premium?: number; withholding?: number }>("/payroll/tax/compute", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ------------------------------------------------------ approval-flows ----- */

export interface ApprovalFlow {
  id: string;
  tenant_id: string;
  applies_to: RequestKind;
  approver_emp_ids: string[];
  created_at: string;
}

export function getApprovalFlows() {
  return apiFetch<{ flows: ApprovalFlow[] }>("/approval-flows");
}

export function setApprovalFlow(kind: RequestKind, approverEmpIds: string[]) {
  return apiFetch<{ id: string; appliesTo: RequestKind; approverEmpIds: string[] }>(
    `/approval-flows/${kind}`,
    { method: "PUT", body: JSON.stringify({ approverEmpIds }) },
  );
}

/* ------------------------------------------------------------ branding ----- */

export interface Branding {
  primaryColor?: string;
  appName?: string;
  logoUrl?: string;
}

export function getBranding() {
  return apiFetch<{ branding: Branding | null; features: Record<string, unknown> | null }>(
    "/api/tenant/branding",
  );
}
