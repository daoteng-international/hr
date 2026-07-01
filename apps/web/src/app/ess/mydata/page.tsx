"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/AuthGate";
import { EssHeader } from "@/components/EssHeader";
import {
  getBranding,
  getMe,
  isAdminRole,
  getProfile,
  saveProfile,
  addEducation,
  addCertification,
  addWorkHistory,
  deleteEducation,
  deleteCertification,
  deleteWorkHistory,
  type Branding,
  type ProfileAggregate,
} from "@/lib/ess-api";

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none";

function MyDataInner() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [empId, setEmpId] = useState<string | null>(null);
  const [data, setData] = useState<ProfileAggregate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // contact form
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    const agg = await getProfile(id);
    setData(agg);
    setPhone(agg.profile?.phone ?? "");
    setAddress(agg.profile?.address ?? "");
    setEmergencyContact(agg.profile?.emergency_contact ?? "");
    setEmergencyPhone(agg.profile?.emergency_phone ?? "");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [b, me] = await Promise.all([getBranding().catch(() => null), getMe()]);
        if (!active) return;
        setBranding(b?.branding ?? null);
        setIsAdmin(isAdminRole(me.role));
        setEmpId(me.id);
        await load(me.id);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "載入失敗");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  async function onSaveContact(e: FormEvent) {
    e.preventDefault();
    if (!empId) return;
    setSavedMsg(null);
    try {
      await saveProfile(empId, {
        phone: phone.trim() || null,
        address: address.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        emergency_phone: emergencyPhone.trim() || null,
      });
      setSavedMsg("已儲存");
      await load(empId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  async function quickAddEducation() {
    if (!empId) return;
    const school = prompt("學校名稱？");
    if (!school) return;
    await addEducation(empId, { school });
    await load(empId);
  }
  async function quickAddCertification() {
    if (!empId) return;
    const name = prompt("證照名稱？");
    if (!name) return;
    await addCertification(empId, { name });
    await load(empId);
  }
  async function quickAddWork() {
    if (!empId) return;
    const company = prompt("公司名稱？");
    if (!company) return;
    await addWorkHistory(empId, { company });
    await load(empId);
  }

  async function removeItem(kind: "edu" | "cert" | "work", id: string) {
    if (!empId) return;
    if (kind === "edu") await deleteEducation(id);
    if (kind === "cert") await deleteCertification(id);
    if (kind === "work") await deleteWorkHistory(id);
    await load(empId);
  }

  const seniority =
    data?.seniorityDays != null ? `${Math.floor(data.seniorityDays / 365)} 年 ${data.seniorityDays % 365} 天` : "—";

  return (
    <div className="min-h-screen bg-gray-50">
      <EssHeader
        appName={branding?.appName}
        primaryColor={branding?.primaryColor}
        active="mydata"
        isAdmin={isAdmin}
      />
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading || !data ? (
          <p className="text-sm text-gray-400">載入中…</p>
        ) : (
          <>
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">基本資料</h2>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500">姓名</dt><dd>{data.basic.name}</dd>
                <dt className="text-gray-500">員工編號</dt><dd>{data.basic.emp_no ?? "—"}</dd>
                <dt className="text-gray-500">到職日</dt><dd>{data.basic.hire_date ?? "—"}</dd>
                <dt className="text-gray-500">年資</dt><dd>{seniority}</dd>
              </dl>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">通訊資料</h2>
              <form onSubmit={onSaveContact} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input className={input} placeholder="電話" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <input className={input} placeholder="地址" value={address} onChange={(e) => setAddress(e.target.value)} />
                  <input className={input} placeholder="緊急聯絡人" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
                  <input className={input} placeholder="緊急聯絡電話" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "var(--brand)" }}>
                    儲存
                  </button>
                  {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
                </div>
              </form>
            </section>

            <Section title="學歷證照" onAdd={quickAddEducation} addLabel="+ 學歷">
              {data.educations.map((e) => (
                <Row key={e.id} main={e.school} sub={[e.degree, e.major].filter(Boolean).join(" · ")} onDelete={() => removeItem("edu", e.id)} />
              ))}
              {data.certifications.map((c) => (
                <Row key={c.id} main={c.name} sub={c.issuer ?? ""} tag="證照" onDelete={() => removeItem("cert", c.id)} />
              ))}
              <button onClick={quickAddCertification} className="mt-2 text-sm" style={{ color: "var(--brand)" }}>+ 證照</button>
            </Section>

            <Section title="工作經歷" onAdd={quickAddWork} addLabel="+ 經歷">
              {data.workHistory.map((w) => (
                <Row
                  key={w.id}
                  main={w.company}
                  sub={[w.title, [w.start_date, w.end_date].filter(Boolean).join(" ~ ")].filter(Boolean).join(" · ")}
                  onDelete={() => removeItem("work", w.id)}
                />
              ))}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button onClick={onAdd} className="text-sm font-medium" style={{ color: "var(--brand)" }}>
          {addLabel}
        </button>
      </div>
      <ul className="divide-y divide-gray-100">{children}</ul>
    </section>
  );
}

function Row({
  main,
  sub,
  tag,
  onDelete,
}: {
  main: string;
  sub?: string;
  tag?: string;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-800">{main}</span>
        {tag && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{tag}</span>}
        {sub && <span className="text-xs text-gray-500">{sub}</span>}
      </div>
      <button onClick={onDelete} className="text-sm text-red-600 hover:underline">
        刪除
      </button>
    </li>
  );
}

export default function MyDataPage() {
  return (
    <AuthGate>
      <MyDataInner />
    </AuthGate>
  );
}
