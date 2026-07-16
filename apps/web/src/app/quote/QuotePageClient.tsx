"use client";

import { useMemo, useState } from "react";

type ModuleCategory = "核心人資" | "差勤排班" | "薪資財務" | "招募成長" | "AI 與整合";

interface HrModule {
  id: string;
  category: ModuleCategory;
  name: string;
  tagline: string;
  features: string[];
  monthlyBase: number;
  perEmployee: number;
  recommended?: boolean;
}

const modules: HrModule[] = [
  {
    id: "core",
    category: "核心人資",
    name: "人員與組織管理",
    tagline: "員工資料、部門、角色權限與白標入口。",
    features: ["People 人員名冊", "Org 單位 / 組織圖", "員工自助入口", "白標品牌設定"],
    monthlyBase: 3000,
    perEmployee: 18,
    recommended: true,
  },
  {
    id: "mydata",
    category: "核心人資",
    name: "My Data 員工資料包",
    tagline: "基本資料、通訊、學歷證照、工作經歷與附件。",
    features: ["個人資料維護", "證件 / 照片 / 附件", "學歷證照", "職務經歷與年資"],
    monthlyBase: 1800,
    perEmployee: 10,
  },
  {
    id: "attendance",
    category: "差勤排班",
    name: "差勤打卡管理",
    tagline: "手機打卡、GPS、補卡、忘打卡提醒與紀錄維護。",
    features: ["上下班打卡", "GPS / Web 打卡", "忘打卡補登", "異常通知"],
    monthlyBase: 4200,
    perEmployee: 32,
    recommended: true,
  },
  {
    id: "schedule",
    category: "差勤排班",
    name: "排班與班表審核",
    tagline: "班別、排班、個人班表確認與爭議流程。",
    features: ["班別設定", "單日 / 批次排班", "班表確認", "CSV 匯入"],
    monthlyBase: 3600,
    perEmployee: 25,
  },
  {
    id: "forms",
    category: "差勤排班",
    name: "請假 / 加班 / 出差表單",
    tagline: "多段請假、代理人、附件、多關簽核與催簽。",
    features: ["請假與剩餘假別", "加班給付方式", "公出 / 出差", "多關簽核"],
    monthlyBase: 3800,
    perEmployee: 26,
    recommended: true,
  },
  {
    id: "payroll",
    category: "薪資財務",
    name: "薪資與薪資單",
    tagline: "薪資結算、薪資單、保險資料與定版流程。",
    features: ["薪資結算", "薪資單查詢", "薪資保險資料", "批次調薪"],
    monthlyBase: 5200,
    perEmployee: 42,
    recommended: true,
  },
  {
    id: "tax",
    category: "薪資財務",
    name: "所得稅與補充保費",
    tagline: "非員工所得、扣繳試算、補充保費與 CSV 匯出。",
    features: ["所得稅作業", "補充保費試算", "非員工所得", "CSV 匯出"],
    monthlyBase: 3000,
    perEmployee: 8,
  },
  {
    id: "reports",
    category: "薪資財務",
    name: "報表中心",
    tagline: "出勤、請假、薪資與人力快照報表。",
    features: ["出勤報表", "表單報表", "薪資報表", "人力快照"],
    monthlyBase: 2800,
    perEmployee: 12,
  },
  {
    id: "onboarding",
    category: "招募成長",
    name: "Hire 報到管理",
    tagline: "新進報到、批次匯入、到職轉員工資料。",
    features: ["報到名冊", "CSV 匯入", "到職轉正", "報到狀態追蹤"],
    monthlyBase: 2400,
    perEmployee: 5,
  },
  {
    id: "recruitment",
    category: "招募成長",
    name: "招募 ATS",
    tagline: "職缺需求單、人才庫、面試、錄用與內部職缺。",
    features: ["職缺需求", "人才庫", "面試行事曆", "錄用通知"],
    monthlyBase: 4600,
    perEmployee: 0,
  },
  {
    id: "ai",
    category: "AI 與整合",
    name: "AI HR 助理",
    tagline: "用自然語言查出勤、薪資、表單與人力風險。",
    features: ["AI 問答", "月報摘要", "風險提示", "權限隔離"],
    monthlyBase: 4800,
    perEmployee: 18,
    recommended: true,
  },
  {
    id: "linkup",
    category: "AI 與整合",
    name: "LinkUp 通知與入口",
    tagline: "通知中心、公告、便利貼、公司連結與員工首頁。",
    features: ["通知中心", "公司公告", "我的快捷", "內部連結"],
    monthlyBase: 2600,
    perEmployee: 12,
  },
];

const categories: ModuleCategory[] = ["核心人資", "差勤排班", "薪資財務", "招募成長", "AI 與整合"];
const platformBase = 2800;
const setupBase = 18000;
const annualDiscount = 0.86;
const lineOfficialUrl = "https://line.me/R/ti/p/jWy10iiO7D";
const implementationMultiplier = 1.2;

function currency(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export default function QuotePage() {
  const [employees, setEmployees] = useState(80);
  const [annual, setAnnual] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(["core", "attendance", "forms", "payroll", "ai"]));
  const [copied, setCopied] = useState(false);

  const selectedModules = useMemo(() => modules.filter((item) => selected.has(item.id)), [selected]);
  const quote = useMemo(() => {
    const modulesBase = selectedModules.reduce((total, item) => total + item.monthlyBase, 0);
    const employeeFee = selectedModules.reduce((total, item) => total + item.perEmployee * employees, 0);
    const monthlyBeforeDiscount = platformBase + modulesBase + employeeFee;
    const monthly = annual ? monthlyBeforeDiscount * annualDiscount : monthlyBeforeDiscount;
    const yearly = monthly * 12;
    const setup = setupBase + selectedModules.length * 3500 + Math.max(0, employees - 100) * 35;
    const implementation = selectedModules.length >= 8 ? setup * implementationMultiplier : setup;
    return { modulesBase, employeeFee, monthlyBeforeDiscount, monthly, yearly, implementation };
  }, [annual, employees, selectedModules]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyQuote() {
    const lines = [
      "HRLink 方案估價摘要",
      `員工數：${employees} 人`,
      `付款週期：${annual ? "年繳（約 86 折）" : "月繳"}`,
      `選購模組：${selectedModules.map((item) => item.name).join("、") || "尚未選擇"}`,
      `月費預估：${currency(quote.monthly)}`,
      `年費預估：${currency(quote.yearly)}`,
      `導入設定費：${currency(quote.implementation)}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-900">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#1f4e79_0,#0f172a_45%,#020617_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-10">
            <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-blue-100">HRLink 方案估價器</p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">選擇需要的 HR 模組，立即產生專屬報價</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">依照公司人數與功能需求，自由組合最適合的 HRLink 方案。報價可複製成摘要，也能直接聯絡 LINE@。</p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full bg-white/10 px-3 py-1">即時計價</span>
              <span className="rounded-full bg-white/10 px-3 py-1">年繳折扣</span>
              <span className="rounded-full bg-white/10 px-3 py-1">導入費估算</span>
              <span className="rounded-full bg-white/10 px-3 py-1">可複製摘要</span>
            </div>
          </div>

          <aside className="relative z-10 rounded-3xl border border-white/10 bg-white/95 p-5 text-slate-900 shadow-2xl sm:p-6">
            <p className="text-sm font-semibold text-slate-500">目前預估月費</p>
            <p className="mt-2 text-4xl font-black text-slate-950">{currency(quote.monthly)}</p>
            <p className="mt-1 text-sm text-slate-500">{annual ? `年繳預估 ${currency(quote.yearly)}，已套用約 86 折` : `年化預估 ${currency(quote.yearly)}`}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-100 p-4"><p className="text-slate-500">員工數</p><p className="mt-1 text-2xl font-bold">{employees}</p></div>
              <div className="rounded-2xl bg-slate-100 p-4"><p className="text-slate-500">模組數</p><p className="mt-1 text-2xl font-bold">{selectedModules.length}</p></div>
              <div className="rounded-2xl bg-slate-100 p-4"><p className="text-slate-500">平台費</p><p className="mt-1 font-bold">{currency(platformBase)}</p></div>
              <div className="rounded-2xl bg-slate-100 p-4"><p className="text-slate-500">導入費</p><p className="mt-1 font-bold">{currency(quote.implementation)}</p></div>
            </div>
            <button onClick={() => void copyQuote()} className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5">
              {copied ? "已複製報價摘要" : "複製報價摘要"}
            </button>
          </aside>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr_360px]">
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-bold">客戶條件</h2>
            <label className="mt-5 block text-sm font-semibold text-slate-600">員工人數：{employees} 人</label>
            <input className="mt-3 w-full accent-blue-700" type="range" min="10" max="1000" step="10" value={employees} onChange={(event) => setEmployees(Number(event.target.value))} />
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-slate-400"><span>10</span><span>250</span><span>500</span><span className="text-right">1000</span></div>

            <div className="mt-6 rounded-2xl bg-slate-100 p-2">
              <button onClick={() => setAnnual(false)} className={`w-1/2 rounded-xl px-3 py-2 text-sm font-bold ${!annual ? "bg-white shadow-sm" : "text-slate-500"}`}>月繳</button>
              <button onClick={() => setAnnual(true)} className={`w-1/2 rounded-xl px-3 py-2 text-sm font-bold ${annual ? "bg-white shadow-sm" : "text-slate-500"}`}>年繳 86 折</button>
            </div>

            <div className="mt-6 space-y-2">
              <button onClick={() => setSelected(new Set(modules.map((item) => item.id)))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">全選模組</button>
              <button onClick={() => setSelected(new Set(["core", "attendance", "forms", "payroll", "ai"]))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">推薦組合</button>
              <button onClick={() => setSelected(new Set())} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">清空</button>
            </div>
          </aside>

          <div className="space-y-6">
            {categories.map((category) => (
              <section key={category}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-slate-900">{category}</h2>
                  <span className="text-sm text-slate-400">{modules.filter((item) => item.category === category && selected.has(item.id)).length} 已選</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {modules.filter((item) => item.category === category).map((item) => {
                    const checked = selected.has(item.id);
                    return (
                      <button key={item.id} onClick={() => toggle(item.id)} className={`group rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${checked ? "border-blue-700 bg-blue-50 shadow-sm" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-slate-950">{item.name}</h3>
                              {item.recommended && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">推薦</span>}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{item.tagline}</p>
                          </div>
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-black ${checked ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-transparent"}`}>✓</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.features.map((feature) => <span key={feature} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{feature}</span>)}
                        </div>
                        <p className="mt-4 text-sm font-bold text-slate-800">{currency(item.monthlyBase)} / 月 + {currency(item.perEmployee)} / 人</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-black">報價明細</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">平台基本費</span><strong>{currency(platformBase)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">模組固定月費</span><strong>{currency(quote.modulesBase)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">員工用量費</span><strong>{currency(quote.employeeFee)}</strong></div>
              {annual && <div className="flex justify-between text-emerald-700"><span>年繳折扣</span><strong>-{currency(quote.monthlyBeforeDiscount - quote.monthly)}</strong></div>}
            </div>
            <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">預估月費</p>
              <p className="mt-1 text-3xl font-black">{currency(quote.monthly)}</p>
              <p className="mt-2 text-sm text-slate-300">導入設定費另計 {currency(quote.implementation)}</p>
            </div>
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-bold text-slate-500">已選模組</h3>
              {selectedModules.length === 0 ? <p className="text-sm text-slate-400">尚未選擇模組</p> : (
                <ul className="space-y-2 text-sm text-slate-700">
                  {selectedModules.map((item) => <li key={item.id} className="flex justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"><span>{item.name}</span><span className="shrink-0 text-slate-400">{item.category}</span></li>)}
                </ul>
              )}
            </div>
            <a
              href={lineOfficialUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block w-full rounded-2xl bg-blue-700 px-5 py-3 text-center font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              聯絡 LINE@
            </a>
            <p className="mt-3 text-xs leading-5 text-slate-400">此頁為初步估價工具，正式報價可依導入範圍、資料移轉、客製整合與合約年限調整。</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
