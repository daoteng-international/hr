"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";

const PERMISSIONS = [
  { module: "LinkUp", unit: "最新消息 / 部門公告 / 公司規章", desc: "公告、規章、內部連結與入口快捷管理", account: "HR 管理員" },
  { module: "Foundation", unit: "Hire / Org / People / My Data", desc: "報到、人員主檔、組織與履歷資料", account: "HR 管理員" },
  { module: "Attendance", unit: "班表 / 打卡 / 請假 / 加班 / 報表", desc: "差勤申請、簽核、補登、結算、假別時數", account: "HR 管理員 / 主管" },
  { module: "Payroll", unit: "薪資 / 保險 / 稅務", desc: "薪資保險資料、薪資單、所得稅與補充保費", account: "HR 管理員 / 財務" },
  { module: "Recruitment", unit: "ATS", desc: "職缺需求單、人才庫、面試與錄用流程", account: "HR 管理員 / 招募" },
  { module: "Dashboard", unit: "人力分析", desc: "期初、新進、離職、期末與組織篩選", account: "HR 管理員" },
];

const SITE_SETTINGS = [
  { label: "站台名稱", value: "HR 後台" },
  { label: "品牌色", value: "依 tenant branding 設定" },
  { label: "員工入口", value: "/ess" },
  { label: "管理後台", value: "/admin" },
];

export default function CompanySpacePage() {
  return (
    <>
      <PageHeader title="Company Space" desc="對齊 Apollo：權限項目設定、人員權限查詢、站台設定" />

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">權限項目設定</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="py-2 pr-4">模組</th>
                <th className="py-2 pr-4">單元</th>
                <th className="py-2 pr-4">說明</th>
                <th className="py-2 pr-4">管理帳號</th>
                <th className="py-2">動作</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((row) => (
                <tr key={`${row.module}-${row.unit}`} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-800">{row.module}</td>
                  <td className="py-2 pr-4">{row.unit}</td>
                  <td className="py-2 pr-4 text-gray-600">{row.desc}</td>
                  <td className="py-2 pr-4">{row.account}</td>
                  <td className="py-2">設定</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-medium text-gray-500">人員權限查詢</h2>
          <p className="text-sm text-gray-600">員工角色與後台權限目前由 People 人員資料的角色欄位管理。</p>
          <Link href="/admin/employees" className="mt-4 inline-block text-sm font-medium" style={{ color: "var(--brand)" }}>
            前往 People 人員
          </Link>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-medium text-gray-500">站台設定</h2>
          <dl className="space-y-2 text-sm">
            {SITE_SETTINGS.map((item) => (
              <div key={item.label} className="flex justify-between gap-4">
                <dt className="text-gray-500">{item.label}</dt>
                <dd className="font-medium text-gray-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
