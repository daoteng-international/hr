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
  dept_id: string | null;
  emp_no: string | null;
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
  agent_name: string | null;
  payout: "pay" | "comp_time" | null;
  trip_type: "outing" | "business_trip" | null;
  location: string | null;
  remark: string | null;
  segments: unknown;
  status: RequestStatus;
  current_step: number;
  created_at: string;
}

export interface RequestQuery {
  status?: RequestStatus;
  kind?: RequestKind;
  employeeId?: string;
  from?: string;
  to?: string;
}

export function getRequests(params?: RequestStatus | RequestQuery) {
  const query: RequestQuery = typeof params === "string" ? { status: params } : (params ?? {});
  const qs = new URLSearchParams();
  if (query.status) qs.set("status", query.status);
  if (query.kind) qs.set("kind", query.kind);
  if (query.employeeId) qs.set("employeeId", query.employeeId);
  if (query.from) qs.set("from", query.from);
  if (query.to) qs.set("to", query.to);
  return apiFetch<{ requests: LeaveRequest[] }>(
    `/requests${qs.toString() ? `?${qs.toString()}` : ""}`,
  );
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

export function batchDecideRequests(body: {
  ids: string[];
  action: "approve" | "reject";
  comment?: string;
}) {
  return apiFetch<{
    ok: number;
    failed: number;
    results: Array<
      | { ok: true; id: string; status: RequestStatus; currentStep: number }
      | { ok: false; id: string; error: string }
    >;
  }>("/requests/batch-decision", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function remindRequest(id: string) {
  return apiFetch<{ notified: number; employeeId: string }>(`/requests/${id}/remind`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function deleteRequest(id: string) {
  return apiFetch<{ id: string }>(`/requests/${id}`, { method: "DELETE" });
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
  managerEmpId?: string | null;
  employmentType?: string;
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
  status: "draft" | "pending_approval" | "open" | "closed";
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
  status?: "draft" | "pending_approval" | "open" | "closed";
  description?: string;
}) {
  return apiFetch<{ id: string }>("/job-requisitions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateJobRequisition(
  id: string,
  body: { status?: "draft" | "pending_approval" | "open" | "closed"; isInternal?: boolean },
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

/* ------------------------------------------------- punch records (HR) --- */

export interface PunchRecord {
  id: string;
  employee_id: string;
  punch_at: string;
  type: "in" | "out" | "break_in" | "break_out" | "outing_in" | "outing_out";
  source: string | null;
  lat: number | null;
  lng: number | null;
  device_id: string | null;
}

export function getPunchRecordsAdmin(filters?: {
  employeeId?: string;
  deptId?: string;
  type?: PunchRecord["type"];
  source?: "gps" | "web" | "line" | "manual";
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.employeeId) params.set("employeeId", filters.employeeId);
  if (filters?.deptId) params.set("deptId", filters.deptId);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const qs = params.toString();
  return apiFetch<{ records: PunchRecord[] }>(`/punch${qs ? `?${qs}` : ""}`);
}

export function createManualPunch(body: {
  employeeId: string;
  punchAt: string;
  type: PunchRecord["type"];
}) {
  return apiFetch<{ id: string }>("/punch/manual", {
    method: "POST",
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

export interface SalaryAdjustment {
  id: string;
  employee_id: string;
  effective_date: string;
  new_salary: string;
  reason: string | null;
  created_at: string;
}

export function getSalaryAdjustments(employeeId?: string) {
  const qs = employeeId ? `?employeeId=${employeeId}` : "";
  return apiFetch<{ "salary-adjustments": SalaryAdjustment[] }>(`/salary-adjustments${qs}`);
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

export interface TenantPermission {
  module: string;
  unit: string;
  desc?: string;
  account?: string;
  enabled?: boolean;
}

export interface InternalLink {
  name: string;
  url: string;
  enabled?: boolean;
  sort?: number;
}

export interface TenantFeatures {
  permissions?: TenantPermission[];
  internalLinks?: InternalLink[];
  dashboardWidgets?: string[];
  site?: {
    employeePortalPath?: string;
    adminPortalPath?: string;
  };
  [key: string]: unknown;
}

export function getBranding() {
  return apiFetch<{ branding: Branding | null; features: TenantFeatures | null }>(
    "/api/tenant/branding",
  );
}

export function saveTenantSettings(body: {
  branding?: Branding;
  features?: TenantFeatures;
}) {
  return apiFetch<{ branding: Branding | null; features: TenantFeatures | null }>(
    "/api/tenant/settings",
    { method: "PUT", body: JSON.stringify(body) },
  );
}

/* --------------------------------------------------- payroll (薪資作業) --- */

export interface SalaryStructure {
  id: string;
  employee_id: string;
  method: "monthly" | "by_attendance_days";
  base_salary: string | null;
  daily_wage: string | null;
  hourly_wage: string;
  allowances: Record<string, unknown>;
  labor_insured_salary?: string | null;
  health_insured_salary?: string | null;
}

export function getSalaryStructure(employeeId: string) {
  return apiFetch<{ salary: SalaryStructure }>(`/salary/${employeeId}`);
}

export function putSalaryStructure(
  employeeId: string,
  body: {
    method?: "monthly" | "by_attendance_days";
    baseSalary?: number | null;
    dailyWage?: number | null;
    hourlyWage?: number;
    laborInsuredSalary?: number | null;
    healthInsuredSalary?: number | null;
  },
) {
  return apiFetch<{ id: string }>(`/salary/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export interface Payslip {
  id: string;
  employee_id: string;
  period: string;
  base: string;
  overtime_pay: string;
  night_pay: string;
  attendance_bonus: string;
  gross: string;
  status: string;
}

export function runPayroll(period: string, employeeId?: string) {
  return apiFetch<{ payslips?: unknown[]; count?: number }>(`/payroll/run`, {
    method: "POST",
    body: JSON.stringify({ period, employeeId }),
  });
}

export function getPayslips(period?: string) {
  const qs = period ? `?period=${period}` : "";
  return apiFetch<{ payslips: Payslip[] }>(`/payslips${qs}`);
}

export function finalizePayslip(id: string) {
  return apiFetch<{ id: string; status: string }>(`/payslips/${id}/finalize`, {
    method: "POST",
  });
}

export interface NhiDependent {
  id: string;
  employee_id: string;
  name: string;
  relationship: string | null;
  insured: boolean;
}

export function getNhiDependents(employeeId: string) {
  return apiFetch<{ "nhi-dependents": NhiDependent[] }>(
    `/nhi-dependents?employeeId=${employeeId}`,
  );
}

export function addNhiDependent(body: { employeeId: string; name: string; relationship?: string }) {
  return apiFetch<{ id: string }>("/nhi-dependents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteNhiDependent(id: string) {
  return apiFetch<{ id: string }>(`/nhi-dependents/${id}`, { method: "DELETE" });
}

export interface TaxDependent {
  id: string;
  employee_id: string;
  name: string;
  relationship: string | null;
  birth_year: number | null;
}

export function getTaxDependents(employeeId: string) {
  return apiFetch<{ "income-tax-dependents": TaxDependent[] }>(
    `/income-tax-dependents?employeeId=${employeeId}`,
  );
}

export function addTaxDependent(body: {
  employeeId: string;
  name: string;
  relationship?: string;
  birthYear?: number;
}) {
  return apiFetch<{ id: string }>("/income-tax-dependents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteTaxDependent(id: string) {
  return apiFetch<{ id: string }>(`/income-tax-dependents/${id}`, { method: "DELETE" });
}

/* ------------------------------------------------ recruitment: 面試/錄用 --- */

export interface Interview {
  id: string;
  candidate_id: string;
  interviewer_emp_id: string | null;
  scheduled_at: string | null;
  stage: string | null;
  result: "pending" | "pass" | "fail";
  notes: string | null;
}

export function getInterviews(candidateId?: string) {
  const qs = candidateId ? `?candidateId=${candidateId}` : "";
  return apiFetch<{ interviews: Interview[] }>(`/interviews${qs}`);
}

export function createInterview(body: {
  candidateId: string;
  scheduledAt?: string;
  stage?: string;
  interviewerEmpId?: string | null;
}) {
  return apiFetch<{ id: string }>("/interviews", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateInterview(
  id: string,
  body: { result?: "pending" | "pass" | "fail"; notes?: string; scheduledAt?: string },
) {
  return apiFetch<{ id: string }>(`/interviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export interface Offer {
  id: string;
  candidate_id: string;
  salary: string | null;
  start_date: string | null;
  status: "draft" | "approved" | "sent" | "accepted" | "declined";
  note: string | null;
}

export function getOffers() {
  return apiFetch<{ offers: Offer[] }>("/offers");
}

export function createOffer(body: { candidateId: string; salary?: number; startDate?: string }) {
  return apiFetch<{ id: string }>("/offers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateOffer(id: string, body: { status?: Offer["status"]; note?: string }) {
  return apiFetch<{ id: string }>(`/offers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/* ----------------------------------------------------------- dashboard --- */

export interface HeadcountMonth {
  month: string;
  opening: number;
  hires: number;
  exits: number;
  closing: number;
}

export function getHeadcount(params: {
  from: string;
  to: string;
  deptId?: string;
  employmentType?: string;
  jobGroup?: string;
}) {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  if (params.deptId) qs.set("deptId", params.deptId);
  if (params.employmentType) qs.set("employmentType", params.employmentType);
  if (params.jobGroup) qs.set("jobGroup", params.jobGroup);
  return apiFetch<{
    series: HeadcountMonth[];
    totals: { opening: number; hires: number; exits: number; closing: number };
  }>(`/dashboard/headcount?${qs.toString()}`);
}

export function getPayslip(id: string) {
  return apiFetch<{ payslip: Payslip & { breakdown: unknown } }>(`/payslips/${id}`);
}

export function exportTaxFilingUrl(type: "withholding" | "supplementary") {
  return `/tax-filing/export?type=${type}`;
}

/* --------------------------------------------------------- Apollo admin --- */

export interface AttendanceDay {
  id: string;
  employee_id: string;
  work_date: string;
  worked_minutes: number;
  late_minutes: number;
  overtime_minutes: number;
  night_minutes: number;
  day_type: string | null;
  anomaly: unknown;
}

export function settleAttendance(body: {
  employeeId?: string;
  from: string;
  to: string;
}) {
  return apiFetch<{ settled: number }>("/attendance/settle", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getAttendanceDays(params: {
  employeeId?: string;
  from?: string;
  to?: string;
} = {}) {
  const qs = new URLSearchParams();
  if (params.employeeId) qs.set("employeeId", params.employeeId);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return apiFetch<{ attendanceDays: AttendanceDay[] }>(
    `/attendance-days${qs.toString() ? `?${qs.toString()}` : ""}`,
  );
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled: number | string;
  used: number | string;
  deferred: number | string;
}

export function getLeaveBalancesAdmin(params: { employeeId?: string; year?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.employeeId) qs.set("employeeId", params.employeeId);
  if (params.year) qs.set("year", String(params.year));
  return apiFetch<{ balances: LeaveBalance[] }>(
    `/leave-balances${qs.toString() ? `?${qs.toString()}` : ""}`,
  );
}

export function setLeaveBalance(body: {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  entitled: number;
  deferred?: number;
}) {
  return apiFetch<{ id: string }>("/leave-balances", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export interface RuleConfigResponse {
  config: unknown;
  version: number;
  scope?: string;
  isDefault: boolean;
}

export function getRuleConfig() {
  return apiFetch<RuleConfigResponse>("/rule-config");
}

export function saveRuleConfig(config: unknown) {
  return apiFetch<{ id: string; version: number }>("/rule-config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export interface HeadcountReport {
  total: number;
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
  byDept: { deptId: string | null; count: number }[];
}

export function getHeadcountReport() {
  return apiFetch<HeadcountReport>("/reports/headcount");
}
