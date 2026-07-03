"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { EssHeader } from "@/components/EssHeader";
import {
  getBranding,
  getMe,
  isAdminRole,
  getMyPayslips,
  type Branding,
  type MyPayslip,
} from "@/lib/ess-api";

function PayslipsInner() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<MyPayslip[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBranding().then((b) => setBranding(b.branding)).catch(() => null);
    getMe().then((m) => setIsAdmin(isAdminRole(m.role))).catch(() => null);
    getMyPayslips()
      .then((r) => setRows(r.payslips))
      .catch((err) => setError(err instanceof Error ? err.message : "載入失敗"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <EssHeader appName={branding?.appName} primaryColor={branding?.primaryColor} active="payslips" isAdmin={isAdmin} />
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">我的薪資單</h2>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="py-2 pr-4">期間</th>
                <th className="py-2 pr-4">本薪</th>
                <th className="py-2 pr-4">加班費</th>
                <th className="py-2 pr-4">全勤獎金</th>
                <th className="py-2 pr-4">應發合計</th>
                <th className="py-2">狀態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-800">{p.period}</td>
                  <td className="py-2 pr-4">{p.base}</td>
                  <td className="py-2 pr-4">{p.overtime_pay}</td>
                  <td className="py-2 pr-4">{p.attendance_bonus}</td>
                  <td className="py-2 pr-4 font-medium">{p.gross}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "finalized" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {p.status === "finalized" ? "已定案" : "草稿"}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-gray-400">尚無薪資單</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

export default function PayslipsPage() {
  return (
    <AuthGate>
      <PayslipsInner />
    </AuthGate>
  );
}
