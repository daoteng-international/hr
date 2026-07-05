"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader, PrimaryButton, ErrorText, Empty, inputCls, labelCls } from "@/components/admin-ui";
import {
  getBranding,
  getRuleConfig,
  saveRuleConfig,
  saveTenantSettings,
  type RuleConfigResponse,
  type TenantFeatures,
} from "@/lib/admin-api";

const CALENDARS = [
  { name: "台灣行事曆", years: ["2025 已發佈", "2026 已發佈", "2027 待新增"] },
  { name: "門市排班行事曆", years: ["2025 已發佈", "2026 已發佈", "2027 待新增"] },
  { name: "總部行事曆", years: ["2025 已發佈", "2026 已發佈", "2027 待新增"] },
];

export default function ModuleSettingsPage() {
  const [ruleConfig, setRuleConfig] = useState<RuleConfigResponse | null>(null);
  const [features, setFeatures] = useState<TenantFeatures>({});
  const [myDataRequiresApproval, setMyDataRequiresApproval] = useState(true);
  const [editableFields, setEditableFields] = useState("basic,contact,education,certification,workHistory");
  const [attachmentLimitKb, setAttachmentLimitKb] = useState("300");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getRuleConfig()
      .then((res) => {
        setRuleConfig(res);
        setDraft(JSON.stringify(res.config, null, 2));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "載入模組設定失敗"));
    getBranding()
      .then((res) => {
        const nextFeatures = res.features ?? {};
        const formParameters = (nextFeatures.formParameters as {
          myDataRequiresApproval?: boolean;
          editableFields?: string[];
          attachmentLimitKb?: number;
        } | undefined) ?? {};
        setFeatures(nextFeatures);
        setMyDataRequiresApproval(formParameters.myDataRequiresApproval ?? true);
        setEditableFields((formParameters.editableFields ?? ["basic", "contact", "education", "certification", "workHistory"]).join(","));
        setAttachmentLimitKb(String(formParameters.attachmentLimitKb ?? 300));
      })
      .catch(() => null);
  }, []);

  async function onSave() {
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(draft);
      const res = await saveRuleConfig(parsed);
      setMessage(`規則設定已儲存，版本 ${res.version}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  async function onSaveFormParameters() {
    setError(null);
    setMessage(null);
    try {
      const nextFeatures = {
        ...features,
        formParameters: {
          myDataRequiresApproval,
          editableFields: editableFields
            .split(",")
            .map((field) => field.trim())
            .filter(Boolean),
          attachmentLimitKb: Number(attachmentLimitKb) || 300,
        },
      };
      const saved = await saveTenantSettings({ features: nextFeatures });
      setFeatures(saved.features ?? nextFeatures);
      setMessage("表單參數已儲存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存表單參數失敗");
    }
  }

  return (
    <>
      <PageHeader title="模組設定" desc="對齊 Apollo：行事曆、差勤薪資規則與功能參數" />

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500">行事曆管理</h2>
          <button className="rounded-md border px-3 py-1.5 text-sm text-gray-600">新增行事曆</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="py-2 pr-4">行事曆名稱</th>
                <th className="py-2 pr-4">2025</th>
                <th className="py-2 pr-4">2026</th>
                <th className="py-2 pr-4">2027</th>
                <th className="py-2">設定</th>
              </tr>
            </thead>
            <tbody>
              {CALENDARS.map((calendar) => (
                <tr key={calendar.name} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-800">{calendar.name}</td>
                  {calendar.years.map((year) => (
                    <td key={year} className="py-2 pr-4">{year}</td>
                  ))}
                  <td className="py-2">編輯</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">差勤 / 薪資規則</h2>
        {ruleConfig ? (
          <>
            <p className="mb-2 text-xs text-gray-500">
              目前版本：{ruleConfig.version} {ruleConfig.isDefault ? "（預設值）" : ""}
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-96 w-full rounded-md border border-gray-300 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <div className="mt-4">
              <PrimaryButton onClick={onSave}>儲存規則</PrimaryButton>
            </div>
          </>
        ) : (
          <Empty>載入中…</Empty>
        )}
        {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-gray-500">表單參數設定</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={myDataRequiresApproval}
              onChange={(event) => setMyDataRequiresApproval(event.target.checked)}
            />
            My Data 修改需送審
          </label>
          <div>
            <label className={labelCls}>可編輯資料區塊</label>
            <input
              className={inputCls}
              value={editableFields}
              onChange={(event) => setEditableFields(event.target.value)}
              placeholder="basic,contact,education"
            />
          </div>
          <div>
            <label className={labelCls}>附件上限 KB</label>
            <input
              type="number"
              className={inputCls}
              value={attachmentLimitKb}
              onChange={(event) => setAttachmentLimitKb(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={onSaveFormParameters}>儲存表單參數</PrimaryButton>
        </div>
      </Card>
    </>
  );
}
