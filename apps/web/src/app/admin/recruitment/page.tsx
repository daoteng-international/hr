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
  getInterviews,
  createInterview,
  updateInterview,
  getOffers,
  createOffer,
  updateOffer,
  type JobRequisition,
  type Candidate,
  type Interview,
  type Offer,
} from "@/lib/admin-api";

const OFFER_STATUSES: Offer["status"][] = ["draft", "approved", "sent", "accepted", "declined"];
const OFFER_LABEL: Record<Offer["status"], string> = {
  draft: "草稿",
  approved: "已核准",
  sent: "已寄出",
  accepted: "已接受",
  declined: "已婉拒",
};

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
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [headcount, setHeadcount] = useState("1");
  const [isInternal, setIsInternal] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(true);

  const [candName, setCandName] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candReq, setCandReq] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, iv, of] = await Promise.all([
        getJobRequisitions(),
        getCandidates(),
        getInterviews(),
        getOffers(),
      ]);
      setReqs(r["job-requisitions"]);
      setCands(c.candidates);
      setInterviews(iv.interviews);
      setOffers(of.offers);
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
        status: needsApproval ? "pending_approval" : "open",
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
  const candidateLabel = (id: string) => cands.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  async function scheduleInterview(candidateId: string) {
    const when = prompt("面試時間？(YYYY-MM-DD HH:mm)");
    if (!when) return;
    const stage = prompt("階段？(一面/二面…可留空)") ?? undefined;
    try {
      await createInterview({
        candidateId,
        scheduledAt: new Date(when.replace(" ", "T")).toISOString(),
        stage: stage || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "安排面試失敗");
    }
  }

  async function recordInterview(id: string, result: "pass" | "fail") {
    const notes = prompt("面試紀錄（可留空）") ?? undefined;
    try {
      await updateInterview(id, { result, notes: notes || undefined });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    }
  }

  async function extendOffer(candidateId: string) {
    const salary = prompt("核薪金額？");
    const startDate = prompt("預定到職日？(YYYY-MM-DD，可留空)") ?? "";
    try {
      await createOffer({
        candidateId,
        salary: salary ? Number(salary) : undefined,
        startDate: startDate || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立錄用單失敗");
    }
  }

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
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              內部職缺（員工可見）
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={needsApproval} onChange={(e) => setNeedsApproval(e.target.checked)} />
              送審核（待審核職缺需求單）
            </label>
          </div>
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
                    {r.status === "open" ? "開放中" : r.status === "closed" ? "已關閉" : r.status === "pending_approval" ? "待審核" : "草稿"}
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
                <div className="flex shrink-0 items-center gap-3">
                  <button onClick={() => scheduleInterview(c.id)} className="text-sm font-medium" style={{ color: "var(--brand)" }}>安排面試</button>
                  <button onClick={() => extendOffer(c.id)} className="text-sm font-medium" style={{ color: "var(--brand)" }}>發錄用單</button>
                  <select
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={c.status}
                    onChange={(e) => changeCandStatus(c.id, e.target.value as Candidate["status"])}
                  >
                    {CAND_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">待審核職缺需求單 / 待審核錄用申請單</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-600">職缺需求單（待審核）</h3>
            <ul className="divide-y divide-gray-100 text-sm">
              {reqs.filter((r) => r.status === "pending_approval").map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span className="font-medium text-gray-800">{r.title} <span className="text-xs text-gray-500">需 {r.headcount} 人</span></span>
                  <span className="flex gap-3">
                    <button onClick={() => updateJobRequisition(r.id, { status: "open" }).then(load)} className="font-medium" style={{ color: "var(--brand)" }}>核准開缺</button>
                    <button onClick={() => updateJobRequisition(r.id, { status: "draft" }).then(load)} className="text-red-600 hover:underline">退回</button>
                  </span>
                </li>
              ))}
              {reqs.filter((r) => r.status === "pending_approval").length === 0 && <li className="py-2 text-gray-400">無待審核</li>}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-600">錄用申請單（待審核）</h3>
            <ul className="divide-y divide-gray-100 text-sm">
              {offers.filter((o) => o.status === "draft").map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <span className="font-medium text-gray-800">{candidateLabel(o.candidate_id)} {o.salary && <span className="text-xs text-gray-500">核薪 {o.salary}</span>}</span>
                  <span className="flex gap-3">
                    <button onClick={() => updateOffer(o.id, { status: "approved" }).then(load)} className="font-medium" style={{ color: "var(--brand)" }}>核准</button>
                    <button onClick={() => updateOffer(o.id, { status: "declined" }).then(load)} className="text-red-600 hover:underline">退回</button>
                  </span>
                </li>
              ))}
              {offers.filter((o) => o.status === "draft").length === 0 && <li className="py-2 text-gray-400">無待審核</li>}
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">公司面試行事曆</h2>
        {(() => {
          const dated = interviews.filter((iv) => iv.scheduled_at);
          if (dated.length === 0) return <Empty>尚無已排程面試</Empty>;
          const byDate = new Map<string, typeof dated>();
          for (const iv of dated) {
            const d = (iv.scheduled_at as string).slice(0, 10);
            byDate.set(d, [...(byDate.get(d) ?? []), iv]);
          }
          return (
            <div className="space-y-3">
              {Array.from(byDate.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, list]) => (
                <div key={date}>
                  <p className="mb-1 text-sm font-semibold text-gray-700">{date}</p>
                  <ul className="ml-3 space-y-1 text-sm text-gray-600">
                    {list.map((iv) => (
                      <li key={iv.id}>
                        {(iv.scheduled_at as string).slice(11, 16)}｜{candidateLabel(iv.candidate_id)}
                        {iv.stage ? `（${iv.stage}）` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">面試行事曆 / 面試紀錄</h2>
        <p className="mb-3 text-xs text-gray-400">在人才庫對人才按「安排面試」即可加入行事曆；面試後記錄結果。</p>
        {interviews.length === 0 ? (
          <Empty>尚無面試</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {interviews.map((iv) => (
              <li key={iv.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{candidateLabel(iv.candidate_id)}</span>
                  <span className="text-gray-500">{iv.scheduled_at ? iv.scheduled_at.replace("T", " ").slice(0, 16) : "未定時間"}</span>
                  {iv.stage && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{iv.stage}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${iv.result === "pass" ? "bg-green-100 text-green-700" : iv.result === "fail" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {iv.result === "pass" ? "通過" : iv.result === "fail" ? "未通過" : "待面試"}
                  </span>
                  {iv.notes && <span className="text-xs text-gray-400">{iv.notes}</span>}
                </div>
                {iv.result === "pending" && (
                  <div className="flex shrink-0 gap-3">
                    <button onClick={() => recordInterview(iv.id, "pass")} className="text-sm font-medium" style={{ color: "var(--brand)" }}>通過</button>
                    <button onClick={() => recordInterview(iv.id, "fail")} className="text-sm text-red-600 hover:underline">未通過</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">錄用申請單 / 錄用通知單</h2>
        {offers.length === 0 ? (
          <Empty>尚無錄用單</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {offers.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{candidateLabel(o.candidate_id)}</span>
                  {o.salary && <span className="text-gray-500">核薪 {o.salary}</span>}
                  {o.start_date && <span className="text-xs text-gray-400">到職 {o.start_date}</span>}
                </div>
                <select
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={o.status}
                  onChange={(e) => updateOffer(o.id, { status: e.target.value as Offer["status"] }).then(load)}
                >
                  {OFFER_STATUSES.map((st) => (
                    <option key={st} value={st}>{OFFER_LABEL[st]}</option>
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
