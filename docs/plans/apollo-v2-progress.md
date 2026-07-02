# Apollo 欄位對齊 v2 — Ralph loop 進度追蹤

> 目標：欄位/篩選/流程與 Apollo 一致（版面自家風格）。規格：`2026-07-01-apollo-field-spec.md`。
> 每模組：schema(+migration+RLS 套 HR-Ai) → API → web → 測試綠 → push main（自動部署 Web+API）。
> 環境重建：clone → 寫 .env（Management API 取 keys）→ `npm i` → `npm -w @hr/rules run build`。

| 模組 | Recon | 開發 | 測試 | 部署 | 備註 |
|---|---|---|---|---|---|
| ① Foundation | ✅ | ✅ | ✅ 205綠 | 🔄 push即部署 | migration 0015 已套 HR-Ai；MyData 6分頁；Hire 篩選+範本+匯入；job_history+年資 |
| ② Attendance | ❌ 待 recon | | | | 個人 12 入口 + 管理者 8 作業 |
| ③ Payroll | ❌ 待 recon | | | | 9 個作業畫面 |
| ④ Recruitment | ❌ 待 recon | | | | 12 入口 |
| ⑤ Dashboard | ❌ 待 recon | | | | 在職人數分析圖表 |

## 完成定義（全部打勾才算完成）
- [x] Foundation 欄位對齊 + 測試綠 + 已部署（commit 待補 sha）
- [ ] Attendance recon + 欄位對齊 + 測試綠 + 已部署
- [ ] Payroll recon + 欄位對齊 + 測試綠 + 已部署
- [ ] Recruitment recon + 欄位對齊 + 測試綠 + 已部署
- [ ] Dashboard recon + 開發 + 測試綠 + 已部署
- [ ] 全套件跑綠 + 線上驗證 + 通知使用者
