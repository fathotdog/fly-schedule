# 排課系統免安裝打包設計

日期：2026-07-04
狀態：已核准（待實作計畫）

## 目標

把現有的排課系統（.NET 10 Minimal API + React/Vite）打包成一份**免安裝、可無腦使用**的交付物，給沒有 IT 基礎的人員使用。

## 決策摘要（brainstorming 確認）

| 項目 | 決定 |
|------|------|
| 使用情境 | 各自一份、本機跑（每台電腦自己開自己用、資料存本機） |
| 目標電腦 | 一般 Windows、什麼都沒裝 → 自帶 .NET 執行環境（self-contained） |
| 交付形式 | 方法 A：免安裝綠色資料夾（壓成 zip） |
| 執行環境目標 | win-x64、Windows 10/11 |

不做（YAGNI）：區網多人共用伺服器、安裝精靈（setup.exe）、單一 exe（single-file）、程式碼簽章、系統匣常駐。

## 架構

### 現況
- 後端：`src/Schedule.Api`，ASP.NET Core 10 Minimal API，endpoints 全掛在 `/api/*`，SQLite（`schedule.db`），EF Core 自動 migrate。
- 前端：`src/schedule-web`，React 19 + Vite，axios `baseURL = '/api'`，開發時靠 Vite proxy `/api` → `localhost:5041`。
- 啟動：`start.bat` 開兩個 dev server（`dotnet run` + `npm run dev`）。

### 打包後
合併成**單一伺服器程序**：.NET 後端同時提供 API 與前端靜態畫面，同一個 port（5041）。因為 API 在 `/api`、前端 baseURL 也是 `/api`，同源直接通，不再需要 Vite proxy。

```
排課系統.exe（Kestrel，localhost:5041）
├── /api/*        → Minimal API endpoints（現有）
├── /（其他路徑） → wwwroot 靜態檔（React build 產物）
└── SPA fallback  → 找不到的路徑回 index.html（React Router）
```

## 元件與改動

### 1. 後端提供前端靜態檔（`Program.cs`）
- 在 pipeline 加入 `app.UseDefaultFiles()`、`app.UseStaticFiles()`。
- 在 endpoints 映射之後加入 `app.MapFallbackToFile("index.html")`，支援 React Router 的前端路由。
- `wwwroot/` 由打包腳本在 build 時填入前端產物；開發模式下 `wwwroot/` 為空，前端仍走 Vite，故對開發**零影響**。

### 2. 正式版啟動行為（僅 Production 環境生效）
以 `app.Environment.IsDevelopment()` 為分界，Production（即打包版）才啟用以下行為，開發模式一律不受影響：

- **綁定位址**：Production 綁 `http://localhost:5041`（loopback 127.0.0.1），不對區網開放。
  好處：安全（外部連不到）＋ Windows 防火牆通常不跳詢問視窗（綁 loopback 不觸發）。
- **自動開瀏覽器**：伺服器開始接聽後，用預設瀏覽器開 `http://localhost:5041`（`Process.Start` + `UseShellExecute=true`）。
- **友善主控台視窗**：
  - `Console.Title = "排課系統"`。
  - 印出中文說明橫幅：系統執行中、請勿關閉此視窗、要結束就關掉這個視窗。
  - 技術 log 調安靜（`appsettings.Production.json` 把 LogLevel 預設設為 `Warning`），避免嚇到使用者。
- **防呆單一執行個體**：具名 Mutex。若系統已在執行，再次點兩下只會「幫忙把瀏覽器打開」然後結束，不報錯、不開第二份。
- **資料庫絕對路徑**：連線字串改為以 `AppContext.BaseDirectory` 為基準（`Data Source={BaseDirectory}/schedule.db`），確保 `schedule.db` 一定生在 exe 所在資料夾，與工作目錄無關。

### 3. 交付內容（綠色資料夾 `排課系統/`）
- `排課系統.exe`：self-contained 發佈（自帶 .NET 執行環境），設定 `<ApplicationIcon>`。使用者唯一要點的東西。
- 執行所需 DLL / 原生檔（SkiaSharp、e_sqlite3 等）：與 exe 同資料夾，使用者不需理會。
- `schedule.db`：首次啟動自動建立。**這一個檔＝全部資料，備份就是複製它。**
- 桌面捷徑：打包版**首次啟動時由程式自動**在桌面建立「排課系統」捷徑（透過 WScript.Shell COM，Unicode 安全，含 exe 內嵌圖示）。使用者無需執行任何 `.bat`；捷徑已存在則不重複建立。
- `使用說明.txt`：白話三步驟（①點兩下開啟 ②瀏覽器操作 ③關黑視窗＝關系統）＋ 備份說明 ＋ SmartScreen 提示。

### 4. 一鍵打包腳本 `build-release.ps1`（repo 根目錄，開發者用）
單一指令完成，使用者永遠看不到：
1. `src/schedule-web`：`npm ci`（或 `npm install`）+ `npm run build`。
2. 清空並複製 `dist/*` → `src/Schedule.Api/wwwroot/`。
3. `dotnet publish src/Schedule.Api -c Release -r win-x64 --self-contained true`，輸出到 `release/排課系統/`。
4. 複製 `建立桌面捷徑.bat`、`使用說明.txt` 進交付資料夾。
5. 壓成 `release/排課系統.zip`。

之後每次更新版本只要重跑這個腳本。

### 5. 設定為非單一檔（folder-based）的理由
QuestPDF 依賴 SkiaSharp 原生庫、EF Core SQLite 依賴 `e_sqlite3` 原生庫。single-file 需要 self-extract 原生檔、啟動較慢且偶有防毒誤判。folder-based（self-contained 但非 single-file）最穩定「開箱即用」，且使用者只透過捷徑操作，資料夾內檔案多寡對他無感。

## 資料流

1. 使用者點 `排課系統.exe`（或桌面捷徑）。
2. Kestrel 起在 `localhost:5041`，EF Core 自動 migrate `schedule.db`（不存在則建立）。
3. 程式自動開瀏覽器 → `http://localhost:5041` → 回傳 `wwwroot/index.html`（React app）。
4. React 呼叫 `/api/*` → 同源打到同一個 Kestrel → 讀寫本機 `schedule.db`。
5. 匯出 PDF/Excel：後端用 QuestPDF/ClosedXML 產檔，瀏覽器下載。
6. 使用者關閉黑視窗 → 伺服器結束 → 系統關閉。資料留在 `schedule.db`。

## 測試 / 驗收

在乾淨路徑（模擬使用者環境）跑發佈後的 exe，確認：
- [ ] 點兩下 exe 自動開瀏覽器並顯示畫面。
- [ ] 學期/班級/教師/課程 新增、修改、刪除正常。
- [ ] 排課（timetable slot）新增與衝突偵測正常。
- [ ] **PDF 匯出正常**（驗證 SkiaSharp 原生檔可用）。
- [ ] **Excel 匯出正常**（ClosedXML）。
- [ ] 關閉黑視窗再重開，資料仍在（`schedule.db` 持久化）。
- [ ] 系統已在執行時再點一次 exe，只會開瀏覽器、不報錯（Mutex 防呆）。
- [ ] 開發模式（`dotnet run` + `npm run dev`）仍照常運作，未被打包改動破壞。

## 已知限制與提醒（寫進使用說明）

- **SmartScreen**：exe 無數位簽章，首次執行可能跳「Windows 已保護您的電腦」，按「其他資訊 → 仍要執行」即可。根治需付費程式碼簽章，本次不做。
- **Port 佔用**：5041 若被其他程式佔用會啟動失敗（罕見）；說明檔附排除方式。
- **平台**：僅 win-x64。其他平台需另發佈對應 runtime。

## 其他

- `.gitignore` 新增忽略 build 產物：`release/`、`src/Schedule.Api/wwwroot/`（打包時才生成）。
- 若日後需要，可在此基礎上再包 Inno Setup 安裝精靈（方法 B），本次不做。
