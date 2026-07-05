"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls, labelCls } from "@/components/admin-ui";
import {
  getEmployees,
  inviteEmployee,
  updateEmployee,
  deactivateEmployee,
  getDepartments,
  type Employee,
  type Department,
} from "@/lib/admin-api";

const ROLES: { value: string; label: string }[] = [
  { value: "employee", label: "一般員工" },
  { value: "manager", label: "主管" },
  { value: "hr_admin", label: "HR 管理員" },
];

function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export default function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // invite form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [deptId, setDeptId] = useState("");
  const [empNo, setEmpNo] = useState("");
  const [employmentType, setEmploymentType] = useState("regular");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("employee");
  const [editDeptId, setEditDeptId] = useState("");
  const [editEmpNo, setEditEmpNo] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("regular");
  const [editStatus, setEditStatus] = useState("active");

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

  useEffect(() => {
    void load();
  }, [load]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
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
      });
      setEmail("");
      setName("");
      setPassword("");
      setRole("employee");
      setDeptId("");
      setEmpNo("");
      setEmploymentType("regular");
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
        status: editStatus,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    }
  }

  const deptName = (id: string | null) => depts.find((dept) => dept.id === id)?.name ?? "—";
  const employmentTypeLabel = (value: string | null) => {
    if (value === "regular") return "正職";
    if (value === "parttime") return "兼職";
    if (value === "contract") return "約聘";
    return value ?? "—";
  };

  async function onDeactivate(id: string) {
    if (!confirm("確定停用此員工？")) return;
    try {
      await deactivateEmployee(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "停用失敗");
    }
  }

  return (
    <>
      <PageHeader title="員工" desc="邀請與管理員工帳號" />

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">邀請員工</h2>
        <form onSubmit={onInvite} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>姓名</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>工號</label>
              <input className={inputCls} value={empNo} onChange={(e) => setEmpNo(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>初始密碼（≥8 碼）</label>
              <input
                type="text"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>角色</label>
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>部門（選填）</label>
              <select
                className={inputCls}
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
              >
                <option value="">（不指定）</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>身分類別</label>
              <select className={inputCls} value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                <option value="regular">正職</option>
                <option value="parttime">兼職</option>
                <option value="contract">約聘</option>
              </select>
            </div>
          </div>
          {formError && <ErrorText>{formError}</ErrorText>}
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "邀請中…" : "邀請員工"}
          </PrimaryButton>
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
          <ul className="divide-y divide-gray-100">
            {rows.map((emp) => (
              <li key={emp.id} className="py-3">
                {editingId === emp.id ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                    <div className="flex-1">
                      <label className={labelCls}>姓名</label>
                      <input
                        className={inputCls}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>工號</label>
                      <input className={inputCls} value={editEmpNo} onChange={(e) => setEditEmpNo(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>角色</label>
                      <select
                        className={inputCls}
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>單位</label>
                      <select className={inputCls} value={editDeptId} onChange={(e) => setEditDeptId(e.target.value)}>
                        <option value="">（不指定）</option>
                        {depts.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>身分類別</label>
                      <select className={inputCls} value={editEmploymentType} onChange={(e) => setEditEmploymentType(e.target.value)}>
                        <option value="regular">正職</option>
                        <option value="parttime">兼職</option>
                        <option value="contract">約聘</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>狀態</label>
                      <select className={inputCls} value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                        <option value="active">在職</option>
                        <option value="inactive">停用</option>
                      </select>
                    </div>
                    <div className="flex shrink-0 gap-2 pb-2">
                      <button
                        onClick={() => saveEdit(emp.id)}
                        className="text-sm font-medium"
                        style={{ color: "var(--brand)" }}
                      >
                        儲存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm text-gray-500 hover:underline"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{emp.name}</span>
                        {emp.emp_no && <span className="text-xs text-gray-500">工號 {emp.emp_no}</span>}
                        <span className="text-xs text-gray-500">單位 {deptName(emp.dept_id)}</span>
                        <span className="text-xs text-gray-500">{employmentTypeLabel(emp.employment_type)}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {roleLabel(emp.role)}
                        </span>
                        {emp.status !== "active" && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                            {emp.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button
                        onClick={() => {
                          setEditingId(emp.id);
                          setEditName(emp.name);
                          setEditRole(emp.role);
                          setEditDeptId(emp.dept_id ?? "");
                          setEditEmpNo(emp.emp_no ?? "");
                          setEditEmploymentType(emp.employment_type ?? "regular");
                          setEditStatus(emp.status);
                        }}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        編輯
                      </button>
                      {emp.status === "active" && (
                        <button
                          onClick={() => onDeactivate(emp.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          停用
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
