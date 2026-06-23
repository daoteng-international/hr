# HR 差勤 SaaS（白標多租戶）

多租戶白標人資差勤管理系統。差勤打卡 + 排班 + 簽核 + 工時 + 薪資 + 考核 KPI + 報表 + AI 自動化。

- 設計文件：[`docs/plans/2026-06-23-hr-saas-design.md`](docs/plans/2026-06-23-hr-saas-design.md)
- P0 實作計畫：[`docs/plans/2026-06-23-p0-foundation.md`](docs/plans/2026-06-23-p0-foundation.md)

## 技術棧

Monorepo（npm workspace + Turbo）｜`apps/web` Next.js 16｜`apps/api` Express 5｜`apps/worker` BullMQ｜`packages/db` Drizzle + Supabase + RLS｜`packages/rules` 規則/薪資引擎。

> 狀態：P0 規劃完成，尚未開始實作。
