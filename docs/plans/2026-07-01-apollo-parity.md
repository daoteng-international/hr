# Apollo/MayoHR Feature-Parity Plan

> 目標：以 **Apollo HR Express Edition**（apolloxe.mayohr.com）為對標，將其功能逐步補進本系統。
> 對標盤點日期：2026-07-01。四階段，順序：①差勤補齊 → ②人事主檔強化 → ③招募 ATS → ④台灣薪資法規。
>
> 開發慣例（沿用現有）：每個功能 = `packages/db` schema (Drizzle) + `packages/db/sql` RLS + `apps/api` route (zod 驗證、supabaseAdmin、tenant-scoped、role guard) + `apps/api/src/__tests__` 對真實 Supabase 的 vitest + `apps/web` 前端頁面。測試需 root `.env`（SUPABASE_URL / ANON / SERVICE_ROLE）。

## Apollo 六大模組盤點（對標基準）

- **LinkUp**：可自訂個人入口 Portal（常用流程、流程引導精靈、自定義報表、快捷 widgets：請假/加班/打卡/忘打卡/個人班表/公司規章/部門公告/最新消息/個人資訊/待辦事項/便利貼/我的薪資單/內部連結/內部職缺）。
- **Attendance**：個人（個人班表、我要打卡、忘打卡、打卡紀錄、特殊假別、請假、加班、公出/出差、表單申請紀錄、剩餘假別、待審核表單、班表審核）；管理者（打卡紀錄維護、表單紀錄管理、假別時數管理、結算作業、模組設定、人員基本資料、報表中心、班表匯入）。
- **Foundation**：Hire 報到管理；Org 組織管理（單位 + 公司組織圖）；People 人員管理；My Data（基本/通訊/學歷證照/工作經歷/年資/職務經歷）；報表中心；設定。
- **Payroll**：薪資/保險資料（員工薪資保險、健保眷屬、所得稅扶養親屬、批次調薪）；薪資/獎金作業（執行、查詢/列印）；所得稅/補充保費（非員工資料、其他所得申報、所得稅作業、二代健保補充保費）；報表中心。
- **Recruitment（ATS）**：職缺需求單（+審核）、錄用申請單（+審核）、面試紀錄表、公告管理、人才庫、面試行事曆、公司面試行事曆、錄用/通知單查詢、內部職缺、報表中心。
- **Dashboard**：全公司在職人數分析（期初/新進/離職/期末，可依單位/身分/職務群組篩選）、可自訂儀表板。

---

## 階段 ① 差勤補齊（最接近現有 code，風險低）

| 功能 | 作法 | 需改 schema | 狀態 |
|---|---|---|---|
| 公出/出差 business_trip | `requests.ts` KINDS 加 `business_trip`；approval-flows 同步；ledger 無副作用（no-op）；前端 ESS/Admin 下拉 + 標籤 | 否 | ✅ 完成、測試綠 |
| 班表審核 | `schedules.ts` 新增 `POST /schedules/:id/acknowledge`（→confirmed）、`/dispute`（→disputed）；本人或 HR 可審；複用既有 `status` 欄位 | 否 | ✅ 完成、測試綠 |
| 班表匯入 | `schedules.ts` 新增 `POST /schedules/import`（HR-only，CSV 解析，逐列驗證，複用 upsert） | 否 | ✅ 完成、測試綠 |
| 特殊假別 | `leave_types` 加 `special boolean default false`（migration 0010，已套用 HR-Ai）；`GET /leave-types?special=` 篩選；Admin 假別頁 特殊假別 開關+標籤 | 是（新增欄位，additive，已套用） | ✅ 完成、測試綠 |

## 階段 ② 人事主檔強化

- **Hire 報到管理**：✅ 完成、測試綠。`onboardings` 表（migration 0011）+ RLS(HR-only)；`GET/POST/PATCH/DELETE /onboardings` + `POST /onboardings/:id/complete`（建 employee 並連結，pending→completed）；Admin `/admin/onboarding` 頁。
- **公司組織圖**：✅ 完成、測試綠。`departments.parent_id` 本已存在（免 migration）；`GET /org-chart` 回巢狀樹（全員工可讀）；Admin `/admin/org-chart` 樹狀圖頁 + 首頁入口。
- **豐富員工履歷**：✅ 完成、測試綠。`employee_profiles`(1:1 通訊)/`employee_educations`/`employee_certifications`/`employee_work_history`（migration 0012）+ self-or-HR RLS；`GET/PUT /employees/:id/profile` 聚合(含年資 seniorityDays) + educations/certifications/work-history 子資源 CRUD；ESS `/ess/mydata` 頁。（職務經歷 employee_job_history 暫略。）

## 階段 ③ 招募 ATS（全新模組，最大工程）

- `job_requisitions`（職缺需求單 + 審核流，複用 approval pipeline）
- `candidates` / `talent_pool`（人才庫）
- `interviews`（面試紀錄表、面試行事曆 — 個人 + 公司）
- `hire_applications`（錄用申請單 + 審核）、`offer_letters`（錄用通知單）
- `internal_jobs`（內部職缺，對員工可見）
- 招募報表中心

## 階段 ④ 台灣薪資法規（法規最深，需最多驗證）

- **健保眷屬投保**：`nhi_dependents`（眷屬投保 + 眷口數 → 影響健保費）
- **所得稅扶養親屬**：`income_tax_dependents`（免稅額計算）
- **批次調薪**：`salary_adjustments` 批次匯入 + 生效日
- **所得稅作業（扣繳）**：累進 / 5% 就源扣繳、扣繳憑單彙總（各類所得格式）
- **二代健保補充保費**：獎金逾投保級距 4 倍、兼職、非員工所得等六類補充保費計算
- **非員工所得**：`non_employee_income`（講師費、稿費等）

> ④ 的計算邏輯應放進 `packages/rules`（沿用 payroll-engine + golden tests），API 只做 orchestration。

---

## 驗證與交付

- 每個功能：`npm -w @hr/api run typecheck` + 對應 vitest 綠燈；schema 變更先 `npm run db:generate` 產 migration，經 Supabase 套用後再測。
- 需改 prod schema 的功能，套用前先確認（線上 API 與測試共用同一 Supabase 專案 `HR-Ai`）。
