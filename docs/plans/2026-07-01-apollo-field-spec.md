# Apollo 畫面欄位規格（逐頁記錄，供欄位/流程一致重建）

來源：apolloxe.mayohr.com（DAOTENG 帳號）。記錄日期 2026-07-01。
目標：我們系統的欄位/篩選/按鈕/流程與 Apollo 一致（版面自家風格；不複製其視覺設計）。

## Foundation（人事主檔）— 已完成 recon

### My Data ▸ 基本資料 (/foundation/mydata/basicinfo)
姓、名、英文姓名、國籍、性別、證件類型、證件號碼、證件到期日、證件類型2、證件號碼2、證件到期日2、證件類型3、證件號碼3、證件到期日3、入境時間、生日、婚姻狀態。
另：更改個人大頭照、動態訊息。

### My Data ▸ 通訊資料 (/Foundation/mydata/contactinfo)
電話(手機)、戶籍地址、聯絡地址、公司信箱、私人信箱、緊急聯絡人、緊急聯絡人關係、電話(市話)、電話(手機2)。

### My Data ▸ 學歷證照 (/Foundation/mydata/certificationandeducationinfo)
兩區塊：學歷資料、證照資料（各有 +新增；有「申請修改資料」流程）。
學歷新增欄位：最高學歷(是/否)、學歷類別、學校、科系類別、科系名稱、就學類別(日間部/夜間部/其他)、就學狀態(畢業/就學中/肄業)、就學開始時間、就學結束時間、學校所在地區、上傳證明文件(Office/TXT/壓縮/PDF ≤300KB)。
證照新增欄位：待補（結構同學歷，含名稱/發證單位/日期/上傳）。

### My Data ▸ 工作經歷 (/Foundation/mydata/workexpinfo)
清單 + 新增（公司/職稱/起訖/說明）。空白時無欄位顯示，需點新增。

### My Data ▸ 年資 (/Foundation/mydata/seniorityinfo)
唯讀計算值：內部年資、職等年資、單位年資。

### My Data ▸ 職務經歷 (/Foundation/mydata/jobchangeinfo)
唯讀表格欄位：生效日期、異動行為、直屬單位、職等、職稱。

### Hire 報到 (/foundation/hire)
篩選：狀態(未報到…)、報到區間(起~迄)、關鍵字(先選類別)。
表格欄位：報到日期、姓名、單位、直屬主管、身份類別、地區、（管理操作）。
按鈕：Excel範本下載、批次匯入、新建報到。備註：最多同時選取 25 筆。

### Org+ (/Foundation/OM_zh_tw)
搜尋單位（關鍵字/單位代碼）、新增組織、公司組織圖。

### People+ (/Foundation/PA_zh_tw)
搜尋人員（姓名/工號）、公司組織圖入口。

### 設定 (/Foundation/FormParameter_zh_tw)
表單參數設定（待補）。

## Attendance（差勤）— 待 recon
個人專區 12 入口 + 管理者專區 8 作業，逐頁欄位待記錄。

## Payroll（薪資）— 待 recon
薪資保險資料/健保眷屬/扶養親屬/批次調薪/執行薪資獎金/查詢列印/非員工資料/所得稅作業/補充保費作業，逐頁欄位待記錄。

## Recruitment（招募）— 待 recon
12 入口（職缺需求單、面試紀錄表、面試行事曆、公司面試行事曆、錄用申請單、錄用通知單、人才庫、內部職缺、公告管理…），逐頁欄位待記錄。

## Dashboard — 待 recon
全公司在職人數分析（期初/新進/離職/期末；篩選 單位/身分類別/職務群組）。
