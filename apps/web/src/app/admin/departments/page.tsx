"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls } from "@/components/admin-ui";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department,
} from "@/lib/admin-api";

export default function DepartmentsPage() {
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDepartments();
      setRows(res.departments);
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("請輸入部門名稱");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createDepartment({ name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    try {
      await updateDepartment(id, { name: editName.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("確定刪除此部門？")) return;
    try {
      await deleteDepartment(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除失敗（可能仍有員工歸屬此部門）");
    }
  }

  return (
    <>
      <PageHeader title="部門" desc="維護組織部門" />

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">新增部門</h2>
        <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <input
              className={inputCls}
              placeholder="部門名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "新增中…" : "新增"}
          </PrimaryButton>
        </form>
        {formError && <div className="mt-2"><ErrorText>{formError}</ErrorText></div>}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">部門列表</h2>
        {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}
        {loading ? (
          <Empty>載入中…</Empty>
        ) : rows.length === 0 ? (
          <Empty>尚無部門</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                {editingId === d.id ? (
                  <>
                    <input
                      className={inputCls}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => saveEdit(d.id)}
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
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-800">{d.name}</span>
                    <div className="flex shrink-0 gap-3">
                      <button
                        onClick={() => {
                          setEditingId(d.id);
                          setEditName(d.name);
                        }}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => onDelete(d.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        刪除
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
