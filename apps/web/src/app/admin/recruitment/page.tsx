"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, PageHeader, Empty, ErrorText, PrimaryButton } from "@/components/admin-ui";
import {
  getJobRequisitions,
  createJobRequisition,
  updateJobRequisition,
  deleteJobRequisition,
  getCandidates,
  createCandidate,
  updateCandidate,
  type JobRequisition,
  type Candidate,
} from "@/lib/admin-api";

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

const CAND_STATUSES: Candidate["status"][] = [
  "new",
  "screening",
  "interviewing",
  "offered",
  "hired",
  "rejected",
];

export default function RecruitmentPage() {
  const [reqs, setReqs] = useState<JobRequisition[]>([]);
  const [cands, setCands] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [headcount, setHeadcount] = useState("1");
  const [isInternal, setIsInternal] = useState(false);

  const [candName, setCandName] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candReq, setCandReq] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([getJobRequisitions(), getCandidates()]);
      setReqs(r["job-requisitions"]);
      setCands(c.candidates);
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

  async function onCreateReq(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createJobRequisition({
        title: title.trim(),
        headcount: Number(headcount) || 1,
        isInternal,
        status: "open",
      });
      setTitle("");
      setHeadcount("1");
      setIsInternal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增失敗");
    }
  }

  async function toggleReqStatus(r: JobRequisition) {
    try {
      await updateJobRequisition(r.id, { status: r.status === "open" ? "closed" : "open" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    }
  }

  async function onCreateCand(e: FormEvent) {
    e.preventDefault();
    if (!candName.trim()) return;
    try {
      await createCandidate({
        name: candName.trim(),
        email: candEmail.trim() || undefined,
        requisitionId: candReq || undefined,
      });
      setCandName("");
      setCandEmail("");
      setCandReq("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增失敗");
    }
  }

  async function changeCandStatus(id: string, status: Candidate["status"]) {
    try {
      await updateCandidate(id, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    }
  }

  const reqTitle = (id: string | null) => reqs.find((r) => r.id === id)?.title ?? "—";

  return (
    <>
      <PageHeader title="招募" desc="職缺需求單與人才庫" />

      {error && <div className="mb-3"><ErrorText>{error}</ErrorText></div>}

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">新增職缺</h2>
        <form onSubmit={onCreateReq} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>職缺名稱</label>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="後端工程師" />
            </div>
            <div>
              <label className={labelCls}>需求人數</label>
              <input className={inputCls} type="number" min={1} value={headcount} onChange={(e) => setHeadcount(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
            內部職缺（員工可見）
          </label>
          <PrimaryButton type="submit">新增職缺</PrimaryButton>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">職缺列表</h2>
        {loading ? (
          <Empty>載入中…</Empty>
        ) : reqs.length === 0 ? (
          <Empty>尚無職缺</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reqs.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{r.title}</span>
                  <span className="text-xs text-gray-500">需 {r.headcount} 人</span>
                  {r.is_internal && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">內部</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.status === "open" ? "開放中" : r.status === "closed" ? "已關閉" : "草稿"}
                  </span>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button onClick={() => toggleReqStatus(r)} className="text-sm font-medium" style={{ color: "var(--brand)" }}>
                    {r.status === "open" ? "關閉" : "重新開放"}
                  </button>
                  <button onClick={() => deleteJobRequisition(r.id).then(load)} className="text-sm text-red-600 hover:underline">
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">新增人才</h2>
        <form onSubmit={onCreateCand} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>姓名</label>
              <input className={inputCls} value={candName} onChange={(e) => setCandName(e.target.value)} placeholder="應徵者姓名" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} value={candEmail} onChange={(e) => setCandEmail(e.target.value)} placeholder="name@example.com" />
            </div>
            <div>
              <label className={labelCls}>對應職缺</label>
              <select className={inputCls} value={candReq} onChange={(e) => setCandReq(e.target.value)}>
                <option value="">（不指定）</option>
                {reqs.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
          </div>
          <PrimaryButton type="submit">加入人才庫</PrimaryButton>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">人才庫</h2>
        {loading ? (
          <Empty>載入中…</Empty>
        ) : cands.length === 0 ? (
          <Empty>尚無人才</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cands.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{c.name}</span>
                  {c.email && <span className="text-xs text-gray-500">{c.email}</span>}
                  <span className="text-xs text-gray-400">{reqTitle(c.requisition_id)}</span>
                </div>
                <select
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={c.status}
                  onChange={(e) => changeCandStatus(c.id, e.target.value as Candidate["status"])}
                >
                  {CAND_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
