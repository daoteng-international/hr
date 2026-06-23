# P2 規則引擎與薪資 — 功能規格與進度

P2 把「差勤規則 → 工時結算 → 薪資單」這條最核心的 IP 變成純函式套件
（`packages/rules`，無 IO、可單元測試、可 white-label）。每個功能 TDD：
先寫測試 → 紅 → 實作 → 綠 → commit。閉集合宣告式 DSL，不做圖靈完備腳本。

## 功能清單

- [x] **F1 規則引擎 + 薪資引擎 + 宣告式規則 DSL**（`packages/rules`，純函式）：
  - DSL（`rules-schema.ts`，Zod 閉集合）：`attendance_bonus`（base + 遲到階梯 tiers）、
    `overtime`（when ∈ {weekday_ot|rest_day|fixed_holiday} × multiplier × compTime）、
    `night`（HH:MM window + multiplier）、`payroll`（method monthly|by_attendance_days、
    overtimeFlatHourly、dailyRegularHours）。匯出 `RuleConfigSchema` / `parseRuleConfig`。
  - 領域型別（`types.ts`）：PunchPair / ShiftDef / DayContext / AttendanceDay /
    SalaryStructure / PayslipBreakdown（含逐項 lines 可稽核）。
  - 工時引擎（`worktime-engine.ts`）：`computeAttendanceDay` — 配對上下班、扣除 break、
    依班表起始算遲到、超過 dailyRegularHours 算加班（例假/固定假則全時數為加班）、
    依 night.window 算夜間（正確處理跨午夜 00:00–08:30 及 22:00→02:00 跨日班）。
  - 薪資引擎（`payroll-engine.ts`）：`computePayslip` — 本俸（月薪/出勤天數×日薪）、
    加班費（依 dayType 套倍率；overtimeFlatHourly 覆蓋為固定時薪；compTime 轉補休不發現金）、
    夜間加給、全勤獎金（全月累計遲到套階梯從 base 扣）、逐項 lines 加總 = gross。
  - **三大特殊制度黃金測試**（`__tests__/golden.test.ts`）全綠。
  - 驗收：`npm -w @hr/rules test` 全綠、`npm -w @hr/rules run typecheck` 0 error、
    全 workspace `npm run typecheck` 0 error、不碰 DB/api。
- [ ] **F2 工時結算批次**：把一個區間內的 schedules + punch_records 餵進 `computeAttendanceDay`，
  批次產出 AttendanceDay 並落地（attendance_days 表），供薪資與報表使用。
- [ ] **F3 薪資單產生 + API**：以 `computePayslip` 為核心，HR 觸發月結，產 payslip（含 lines）
  落地 + GET API（HR 全租戶、員工本人）；租戶隔離 + RLS。
- [ ] **F4 補休 / 特休 ledger**：compTime 加班轉補休時數入帳、特休給假/動用，餘額查詢；
  與 F1 的 `compTimeMinutes` 串接。

## 進度日誌
（每完成一個功能在此追加一行：日期 / 功能 / commit / 測試結果）
- 2026-06-24 / F1 規則引擎 + 薪資引擎 + DSL / commit bb2fad1 / golden.test.ts 19 passed +
  rules-schema.test.ts 4 passed（@hr/rules 全套 23 passed、@hr/rules typecheck 0 error、
  全 workspace typecheck 5/5 successful）。三大黃金測試實算 = 期望：
  ① 全勤階梯 遲到 5→扣0/實發2000、6→600/1400、19→600/1400、20→2000/0；
  ② 例假日 8h×1.67 = 2672（不補休 compTime=0）、夜間 00:00–08:30 8h×2.0 = 3200；
  ③ 按出勤天數 22×1600 = 35200、某日 10h 超 8h 兩小時 → flat 2×200 = 400（覆蓋倍率）。
