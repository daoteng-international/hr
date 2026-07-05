"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls, labelCls } from "@/components/admin-ui";
import {
  addEmployeeCertification,
  addEmployeeEducation,
  addEmployeeJobHistory,
  addEmployeeWorkHistory,
  deactivateEmployee,
  deleteEmployeeCertification,
  deleteEmployeeEducation,
  deleteEmployeeWorkHistory,
  getDepartments,
  getEmployeeProfile,
  getEmployees,
  inviteEmployee,
  saveEmployeeProfile,
  updateEmployee,
  type Department,
  type Employee,
  type ProfileAggregate,
  type SaveProfileBody,
} from "@/lib/admin-api";

const ROLES: { value: string; label: string }[] = [
  { value: "employee", label: "一般員工" },
  { value: "manager", label: "主管" },
  { value: "hr_admin", label: "HR 管理員" },
];

const EMPLOYMENT_TYPES = [
  { value: "regular", label: "正職" },
  { value: "parttime", label: "兼職" },
  { value: "contract", label: "約聘" },
  { value: "intern", label: "實習" },
];

const PROFILE_FIELDS: { key: keyof SaveProfileBody; label: string; type?: "date"; group: "basic" | "contact" }[] = [
  { key: "englishName", label: "英文姓名", group: "basic" },
  { key: "nationality", label: "國籍", group: "basic" },
  { key: "gender", label: "性別", group: "basic" },
  { key: "idType", label: "證件類型1", group: "basic" },
  { key: "idNumber", label: "證件號碼1", group: "basic" },
  { key: "idExpiry", label: "證件到期1", type: "date", group: "basic" },
  { key: "idType2", label: "證件類型2", group: "basic" },
  { key: "idNumber2", label: "證件號碼2", group: "basic" },
  { key: "idExpiry2", label: "證件到期2", type: "date", group: "basic" },
  { key: "idType3", label: "證件類型3", group: "basic" },
  { key: "idNumber3", label: "證件號碼3", group: "basic" },
  { key: "idExpiry3", label: "證件到期3", type: "date", group: "basic" },
  { key: "entryDate", label: "入境時間", type: "date", group: "basic" },
  { key: "birthday", label: "生日", type: "date", group: "basic" },
  { key: "maritalStatus", label: "婚姻狀態", group: "basic" },
  { key: "phone", label: "手機", group: "contact" },
  { key: "phoneMobile2", label: "手機2", group: "contact" },
  { key: "phoneLandline", label: "市話", group: "contact" },
  { key: "registeredAddress", label: "戶籍地址", group: "contact" },
  { key: "address", label: "聯絡地址", group: "contact" },
  { key: "companyEmail", label: "公司信箱", group: "contact" },
  { key: "personalEmail", label: "私人信箱", group: "contact" },
  { key: "emergencyContact", label: "緊急聯絡人", group: "contact" },
  { key: "emergencyRelationship", label: "關係", group: "contact" },
  { key: "emergencyPhone", label: "緊急聯絡電話", group: "contact" },
];

const SNAKE: Record<keyof SaveProfileBody, string> = {
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
};

function roleLabel(role: string): string {
  return ROLES.find((item) => item.value === role)?.label ?? role;
}

function employmentTypeLabel(value: string | null) {
  return EMPLOYMENT_TYPES.find((item) => item.value === value)?.label ?? value ?? "—";
}

function profileInitial(profile: ProfileAggregate | null) {
  const values: Record<string, string> = {};
  for (const field of PROFILE_FIELDS) {
    const raw = profile?.profile
      ? (profile.profile as unknown as Record<string, string | null>)[SNAKE[field.key]]
      : null;
    values[field.key] = raw ?? "";
  }
  return values;
}

export default function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [deptId, setDeptId] = useState("");
  const [empNo, setEmpNo] = useState("");
  const [employmentType, setEmploymentType] = useState("regular");
  const [hireDate, setHireDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("employee");
  const [editDeptId, setEditDeptId] = useState("");
  const [editEmpNo, setEditEmpNo] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("regular");
  const [editHireDate, setEditHireDate] = useState("");
  const [editTerminatedAt, setEditTerminatedAt] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const [profileEmpId, setProfileEmpId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileAggregate | null>(null);
  const [profileValues, setProfileValues] = useState<Record<string, string>>({});
  const [profileTab, setProfileTab] = useState<"basic" | "contact">("basic");

  const deptNameMap = useMemo(() => new Map(depts.map((dept) => [dept.id, dept.name])), [depts]);
  const selectedEmployee = rows.find((employee) => employee.id === profileEmpId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([getEmployees(), getDepartments()]);
      setRows(empRes.employees);
      setDepts(deptRes.departments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async (employeeId: string) => {
    const data = await getEmployeeProfile(employeeId);
    setProfile(data);
    setProfileValues(profileInitial(data));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openProfile(employeeId: string) {
    setProfileEmpId(employeeId);
    setProfile(null);
    setError(null);
    try {
      await loadProfile(employeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入 My Data 失敗");
    }
  }

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!email.trim() || !name.trim() || password.length < 8) {
      setFormError("請填寫 Email、姓名，密碼至少 8 碼");
      return;
    }
    setSubmitting(true);
    try {
      await inviteEmployee({
        email: email.trim(),
        name: name.trim(),
        password,
        role,
        deptId: deptId || undefined,
        empNo: empNo.trim() || undefined,
        employmentType,
        hireDate: hireDate || undefined,
      });
      setEmail("");
      setName("");
      setPassword("");
      setRole("employee");
      setDeptId("");
      setEmpNo("");
      setEmploymentType("regular");
      setHireDate("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "邀請失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(id: string) {
    try {
      await updateEmployee(id, {
        name: editName.trim() || undefined,
        role: editRole,
        deptId: editDeptId || null,
        empNo: editEmpNo.trim() || null,
        employmentType: editEmploymentType,
        hireDate: editHireDate || null,
        terminatedAt: editTerminatedAt || null,
        status: editStatus,
      });
      setEditingId(null);
      await load();
      if (profileEmpId === id) await loadProfile(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    }
  }

  async function saveProfileFields(event: FormEvent) {
    event.preventDefault();
    if (!profileEmpId) return;
    const body: SaveProfileBody = {};
    for (const field of PROFILE_FIELDS) {
      const value = (profileValues[field.key] ?? "").trim();
      (body as Record<string, string | null>)[field.key] = value || null;
    }
    await saveEmployeeProfile(profileEmpId, body);
    setMessage("My Data 已儲存");
    await loadProfile(profileEmpId);
  }

  async function quickAddEducation() {
    if (!profileEmpId) return;
    const school = window.prompt("學校？");
    if (!school) return;
    await addEmployeeEducation(profileEmpId, {
      school,
      degree: window.prompt("學歷類別？") || undefined,
      major: window.prompt("科系？") || undefined,
      studyType: window.prompt("就學類別？") || undefined,
      studyStatus: window.prompt("狀態？") || undefined,
      region: window.prompt("地區？") || undefined,
    });
    await loadProfile(profileEmpId);
  }

  async function quickAddCertification() {
    if (!profileEmpId) return;
    const name = window.prompt("證照名稱？");
    if (!name) return;
    await addEmployeeCertification(profileEmpId, {
      name,
      issuer: window.prompt("發證單位？") || undefined,
      issuedDate: window.prompt("發證日期 YYYY-MM-DD？") || undefined,
      expiryDate: window.prompt("到期日 YYYY-MM-DD？") || undefined,
    });
    await loadProfile(profileEmpId);
  }

  async function quickAddWorkHistory() {
    if (!profileEmpId) return;
    const company = window.prompt("公司名稱？");
    if (!company) return;
    await addEmployeeWorkHistory(profileEmpId, {
      company,
      title: window.prompt("職稱？") || undefined,
      startDate: window.prompt("開始日 YYYY-MM-DD？") || undefined,
      endDate: window.prompt("結束日 YYYY-MM-DD？") || undefined,
      description: window.prompt("說明？") || undefined,
    });
    await loadProfile(profileEmpId);
  }

  async function quickAddJobHistory() {
    if (!profileEmpId) return;
    const effectiveDate = window.prompt("生效日 YYYY-MM-DD？");
    const action = window.prompt("異動類型？（新進/晉升/調部門/資料調整）");
    if (!effectiveDate || !action) return;
    const dept = depts.find((item) => item.id === profile?.basic.dept_id);
    await addEmployeeJobHistory(profileEmpId, {
      effectiveDate,
      action,
      deptId: dept?.id ?? null,
      deptName: dept?.name ?? null,
      grade: window.prompt("職等？") || null,
      title: window.prompt("職稱？") || null,
    });
    await loadProfile(profileEmpId);
  }

  async function onDeactivate(id: string) {
    if (!window.confirm("確定停用此員工？")) return;
    try {
      await deactivateEmployee(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "停用失敗");
    }
  }

  const profileFields = PROFILE_FIELDS.filter((field) => field.group === profileTab);

  return (
    <>
      <PageHeader title="員工主檔" desc="帳號、組織、到離職、My Data、學歷證照、工作經歷與年資" />
      {message && <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{message}</p>}

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">邀請員工</h2>
        <form onSubmit={onInvite} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>姓名</label>
              <input className={inputCls} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>工號</label>
              <input className={inputCls} value={empNo} onChange={(event) => setEmpNo(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>到職日</label>
              <input type="date" className={inputCls} value={hireDate} onChange={(event) => setHireDate(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>初始密碼</label>
              <input type="text" className={inputCls} value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>角色</label>
              <select className={inputCls} value={role} onChange={(event) => setRole(event.target.value)}>
                {ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>單位</label>
              <select className={inputCls} value={deptId} onChange={(event) => setDeptId(event.target.value)}>
                <option value="">不指定</option>
                {depts.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>身分類別</label>
              <select className={inputCls} value={employmentType} onChange={(event) => setEmploymentType(event.target.value)}>
                {EMPLOYMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          </div>
          {formError && <ErrorText>{formError}</ErrorText>}
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "邀請中…" : "邀請員工"}</PrimaryButton>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">員工列表</h2>
        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}
        {loading ? (
          <Empty>載入中…</Empty>
        ) : rows.length === 0 ? (
          <Empty>尚無員工</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-4">員工</th>
                  <th className="py-2 pr-4">單位/身分</th>
                  <th className="py-2 pr-4">到離職</th>
                  <th className="py-2 pr-4">角色/狀態</th>
                  <th className="py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-50 align-top">
                    {editingId === employee.id ? (
                      <td colSpan={5} className="py-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-8">
                          <input className={inputCls} value={editName} onChange={(event) => setEditName(event.target.value)} />
                          <input className={inputCls} value={editEmpNo} onChange={(event) => setEditEmpNo(event.target.value)} />
                          <select className={inputCls} value={editDeptId} onChange={(event) => setEditDeptId(event.target.value)}>
                            <option value="">不指定</option>
                            {depts.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                          </select>
                          <select className={inputCls} value={editEmploymentType} onChange={(event) => setEditEmploymentType(event.target.value)}>
                            {EMPLOYMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                          </select>
                          <input type="date" className={inputCls} value={editHireDate} onChange={(event) => setEditHireDate(event.target.value)} />
                          <input type="date" className={inputCls} value={editTerminatedAt} onChange={(event) => setEditTerminatedAt(event.target.value)} />
                          <select className={inputCls} value={editRole} onChange={(event) => setEditRole(event.target.value)}>
                            {ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                          </select>
                          <select className={inputCls} value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
                            <option value="active">在職</option>
                            <option value="inactive">停用</option>
                          </select>
                        </div>
                        <div className="mt-3 flex gap-3">
                          <button onClick={() => void saveEdit(employee.id)} className="text-sm font-medium" style={{ color: "var(--brand)" }}>儲存</button>
                          <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:underline">取消</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-800">{employee.name}</p>
                          <p className="text-xs text-gray-500">工號 {employee.emp_no ?? "—"}</p>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{deptNameMap.get(employee.dept_id ?? "") ?? "—"} / {employmentTypeLabel(employee.employment_type)}</td>
                        <td className="py-3 pr-4 text-gray-600">{employee.hire_date ?? "—"} → {employee.terminated_at ?? "在職"}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{roleLabel(employee.role)}</span>
                          {employee.status !== "active" && <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs text-red-600">{employee.status}</span>}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                setEditingId(employee.id);
                                setEditName(employee.name);
                                setEditRole(employee.role);
                                setEditDeptId(employee.dept_id ?? "");
                                setEditEmpNo(employee.emp_no ?? "");
                                setEditEmploymentType(employee.employment_type ?? "regular");
                                setEditHireDate(employee.hire_date ?? "");
                                setEditTerminatedAt(employee.terminated_at ?? "");
                                setEditStatus(employee.status);
                              }}
                              className="text-sm text-gray-600 hover:underline"
                            >
                              編輯
                            </button>
                            <button onClick={() => void openProfile(employee.id)} className="text-sm font-medium" style={{ color: "var(--brand)" }}>My Data</button>
                            {employee.status === "active" && <button onClick={() => void onDeactivate(employee.id)} className="text-sm text-red-600 hover:underline">停用</button>}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {profileEmpId && (
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-gray-500">My Data 維護</h2>
              <p className="mt-1 font-semibold text-gray-900">{selectedEmployee?.name ?? profileEmpId}</p>
            </div>
            <button onClick={() => setProfileEmpId(null)} className="text-sm text-gray-500 hover:underline">關閉</button>
          </div>
          {!profile ? (
            <Empty>載入 My Data…</Empty>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">內部年資</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{profile.seniority.internalYears ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs text-blue-600">職等年資</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-700">{profile.seniority.gradeYears ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-xs text-green-600">單位年資</p>
                  <p className="mt-1 text-2xl font-semibold text-green-700">{profile.seniority.unitYears ?? "—"}</p>
                </div>
              </div>

              <form onSubmit={saveProfileFields} className="space-y-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setProfileTab("basic")} className={`rounded-full px-4 py-2 text-sm ${profileTab === "basic" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>基本資料</button>
                  <button type="button" onClick={() => setProfileTab("contact")} className={`rounded-full px-4 py-2 text-sm ${profileTab === "contact" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>通訊資料</button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {profileFields.map((field) => (
                    <div key={field.key}>
                      <label className={labelCls}>{field.label}</label>
                      <input
                        type={field.type ?? "text"}
                        className={inputCls}
                        value={profileValues[field.key] ?? ""}
                        onChange={(event) => setProfileValues((values) => ({ ...values, [field.key]: event.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <PrimaryButton type="submit">儲存 My Data</PrimaryButton>
              </form>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">學歷</h3>
                    <button onClick={() => void quickAddEducation()} className="text-sm font-medium" style={{ color: "var(--brand)" }}>＋ 新增</button>
                  </div>
                  <ul className="divide-y divide-gray-100 text-sm">
                    {profile.educations.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3 py-2">
                        <span>{item.school}｜{item.degree ?? "—"}｜{item.major ?? "—"}</span>
                        <button onClick={() => deleteEmployeeEducation(item.id).then(() => loadProfile(profileEmpId))} className="text-red-600">刪除</button>
                      </li>
                    ))}
                    {profile.educations.length === 0 && <li className="py-2 text-gray-400">無</li>}
                  </ul>
                </section>
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">證照</h3>
                    <button onClick={() => void quickAddCertification()} className="text-sm font-medium" style={{ color: "var(--brand)" }}>＋ 新增</button>
                  </div>
                  <ul className="divide-y divide-gray-100 text-sm">
                    {profile.certifications.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3 py-2">
                        <span>{item.name}｜{item.issuer ?? "—"}｜{item.issued_date ?? "—"}</span>
                        <button onClick={() => deleteEmployeeCertification(item.id).then(() => loadProfile(profileEmpId))} className="text-red-600">刪除</button>
                      </li>
                    ))}
                    {profile.certifications.length === 0 && <li className="py-2 text-gray-400">無</li>}
                  </ul>
                </section>
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">工作經歷</h3>
                    <button onClick={() => void quickAddWorkHistory()} className="text-sm font-medium" style={{ color: "var(--brand)" }}>＋ 新增</button>
                  </div>
                  <ul className="divide-y divide-gray-100 text-sm">
                    {profile.workHistory.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3 py-2">
                        <span>{item.company}｜{item.title ?? "—"}｜{item.start_date ?? "—"} → {item.end_date ?? "—"}</span>
                        <button onClick={() => deleteEmployeeWorkHistory(item.id).then(() => loadProfile(profileEmpId))} className="text-red-600">刪除</button>
                      </li>
                    ))}
                    {profile.workHistory.length === 0 && <li className="py-2 text-gray-400">無</li>}
                  </ul>
                </section>
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">職務經歷</h3>
                    <button onClick={() => void quickAddJobHistory()} className="text-sm font-medium" style={{ color: "var(--brand)" }}>＋ 新增</button>
                  </div>
                  <ul className="divide-y divide-gray-100 text-sm">
                    {profile.jobHistory.map((item) => (
                      <li key={item.id} className="py-2">
                        {item.effective_date}｜{item.action}｜{item.dept_name ?? (item.dept_id ? deptNameMap.get(item.dept_id) : "—")}｜{item.grade ?? "—"}｜{item.title ?? "—"}
                      </li>
                    ))}
                    {profile.jobHistory.length === 0 && <li className="py-2 text-gray-400">無</li>}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
