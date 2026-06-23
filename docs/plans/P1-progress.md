# P1 差勤核心 — 功能規格與進度（Ralph 自主開發）

每個功能：TDD（對真實 Supabase ref xpbxfeslajiwkmfigjul）→ 測試綠 → commit → CI 自動部署。
完成標記 `[x]`。所有業務表帶 `tenant_id`，RLS 雙防線；API 經 `requireTenant` + 角色守衛。

## 功能清單

- [x] **F1 組織與員工管理 API**（HR admin）：departments CRUD；employees list/invite(建 Auth user+列)/update(dept/role/status)/deactivate。驗收：HR 可管理、租戶隔離、非 HR 不可寫、跨租戶讀不到、測試綠。
- [x] **F2 班別與排班**（schema 擴充 shifts/schedules + RLS）：shifts CRUD；schedules 指派/查詢（依員工/日期）。驗收：表建+RLS、CRUD 租戶隔離、測試綠。
- [x] **F3 打卡 API**（schema punch_records + RLS）：員工 punch in/out（GPS lat/lng/source）；查當日狀態；不可代打。驗收：打卡寫入正確、本人限定、租戶隔離、測試綠。
- [x] **F4 請假/加班/補卡 + 多關簽核**（schema leave_types/leave_requests/approval_flows/approval_steps + RLS）：送單、簽核流程、approve/reject 狀態機。驗收：狀態轉移正確、簽核者權限、測試綠。
- [ ] **F5 公佈欄**（schema announcements + RLS）：HR 發佈、員工讀。驗收：租戶隔離、測試綠。
- [ ] **F6 ESS 員工自助頁**（apps/web /ess）：登入、打卡、我的出勤、送申請。驗收：build 綠、可呼叫 API。
- [ ] **F7 後台管理頁**（apps/web /admin）：departments/employees/shifts/schedules/簽核。驗收：build 綠。
- [ ] **F8 LINE 通知**：忘打卡/簽核通知（LINE Messaging API）。驗收：發送函式 + 測試。

## 進度日誌
（每完成一個功能在此追加一行：日期 / 功能 / commit / 測試結果）
- 2026-06-24 / F1 組織與員工管理 API / commit 6bb04f4 / org-management.test.ts 13 passed（API 全套 28 passed、typecheck 0 error）
- 2026-06-24 / F2 班別與排班 / scheduling.test.ts 15 passed（API 全套 43 passed、typecheck 0 error）；新增 shifts/schedules 表 + RLS（relrowsecurity=true、4 policies）、shifts/schedules CRUD/assign API
- 2026-06-24 / F3 打卡 API / punch.test.ts 12 passed（API 全套 55 passed、typecheck 0 error）；新增 punch_records 表（migration 0002 + index）+ RLS 0003（relrowsecurity=true、3 policies：self_or_hr_read / self_insert 防代打 / hr_write）、POST /punch（自動推斷 in/out、本人限定）/ GET /punch/today（含 working|off 狀態）/ GET /punch 查詢（HR 全租戶、非 HR 強制本人、日期窗）
- 2026-06-24 / F4 請假/加班/補卡 + 多關簽核 / requests.test.ts 21 passed（API 全套 76 passed、typecheck 0 error、build 綠）；新增 leave_types/approval_flows/leave_requests/approval_steps 4 表（migration 0003）+ RLS 0004（4 表 relrowsecurity=true、共 9 policies：leave_types/approval_flows 各 tenant_read+hr_write、lr_read/lr_self_insert/lr_hr_write、as_read/as_hr_write）；leave-types CRUD（HR）、approval-flows GET/PUT:kind upsert（HR）、requests 送單（依 kind 解析 approval_flow 建有序 approval_steps，無流程則退回任一 hr_admin 單關）/ GET 依角色（HR 全租戶、員工本人∪當前輪到自己簽的、?status 篩選）/ approve（推進 current_step 或最後一關→approved）/ reject（→rejected）/ cancel（送單本人限 pending）；狀態機守衛：非當前簽核人 403、非 pending 409、非送單者 cancel 403
