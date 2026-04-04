# 配課 (CourseAssignment) 優化計畫

## Context

配課功能是排課系統的核心，連結學期、課程、教師、班級。經全面研究後發現 19 項可優化之處，涵蓋資料完整性漏洞、後端品質、前端 UX/效能、測試覆蓋率。以下按優先級分階段列出。

---

## Phase 1: 資料完整性修復 (Critical)

### 1a. 單筆 DELETE 繞過排課保護 [S] ✅ 已完成
- **問題**: `CourseAssignmentEndpoints.cs:107-115` 的 DELETE `/{id}` 未檢查 TimetableSlots，會因 cascade delete 無聲刪除已排好的課表
- **修復**: Include TimetableSlots，若 `Count > 0` 回傳 400，與 `BatchAsync` 一致
- **實作結果**: 已在 endpoint 加入 `TimetableSlots` 檢查，若已有排課則回傳 `400 BadRequest`
- **檔案**: `src/Schedule.Api/Endpoints/CourseAssignmentEndpoints.cs`, `tests/Schedule.Api.Tests/CourseAssignmentEndpointTests.cs`

### 1b. Excel 匯入跳過未指定教師的配課 [S] ✅ 已完成
- **問題**: `ExcelService.cs:234` 教師欄空白就整列跳過，無法匯入未分配教師的配課
- **修復**: teacherName 空白時 `teacher = null` 繼續處理；既有紀錄查詢也要支援 `TeacherId == null`
- **實作結果**: 教師欄空白時會建立或更新 `TeacherId = null` 的配課，不再整列略過
- **檔案**: `src/Schedule.Api/Services/ExcelService.cs`, `tests/Schedule.Api.Tests/ExcelServiceTests.cs`

### 1c. 配課時不檢查教師每週節數上限 [M] ✅ 已完成
- **問題**: Teacher 有 `MaxWeeklyPeriods` 但 `AssignTeacherAsync` / `BatchByTeacherAsync` 都不檢查
- **修復**: 加總該教師本學期已有節數 + 新增節數，超過上限回傳錯誤。Request DTO 加 `force: bool` 讓前端可跳過（顯示確認對話框後重送）
- **實作結果**: 已在 `AssignTeacherAsync` 與 `BatchByTeacherAsync` 檢查 `MaxWeeklyPeriods`，超限時回傳錯誤；DTO 已加入 `force`，前端型別也已同步，但確認後重送的 UI 流程尚未實作
- **檔案**: `src/Schedule.Api/Services/CourseAssignmentService.cs`, `src/Schedule.Api/Dtos/CourseAssignmentDtos.cs`, `src/schedule-web/src/api/types.ts`, `tests/Schedule.Api.Tests/CourseAssignmentServiceTests.cs`

---

## Phase 2: 後端程式品質 [High]

### 2a. 重複的查詢邏輯 [S] ✅ 已完成
- **問題**: GET endpoint 直接查 DB，與 `GetAssignmentsAsync` 完全重複
- **修復**: endpoint 改呼叫 service 方法
- **實作結果**: GET endpoint 改為注入 `CourseAssignmentService` 並呼叫 `GetAssignmentsAsync`（已改為 public），移除重複的 inline 查詢及未使用的 `Microsoft.EntityFrameworkCore` using
- **檔案**: `CourseAssignmentEndpoints.cs`, `CourseAssignmentService.cs`

### 2b. ApplyCopy 永遠回傳 Updated=0 [S] ✅ 已完成
- **問題**: copy 只做 create 或 skip，Updated 欄位是死碼
- **修復**: 移除 Updated 欄位，簡化為 `(Created, Skipped)`
- **實作結果**: `ApplyCopy` 回傳改為 `(int Created, int Skipped)`，`CopyCourseAssignmentsResponse` 與 `CopyCourseAssignmentsToGradeResponse` 移除 Updated，前端型別與 toast 訊息同步更新
- **檔案**: `CourseAssignmentService.cs`, `CourseAssignmentDtos.cs`, `types.ts`, `BatchAssignmentPanel.tsx`

### 2c. UnassignTeacher 無驗證 [S] ✅ 已完成
- **問題**: 傳入不存在的 ID 也靜默成功
- **修復**: 比對查詢結果數量，不匹配時回傳錯誤
- **實作結果**: `UnassignTeacherAsync` 回傳改為 `Task<string?>`，查詢結果數量不符時回傳錯誤；endpoint 改為處理錯誤回傳 400；新增 `UnassignTeacher_RejectsNonexistentIds` 測試
- **檔案**: `CourseAssignmentService.cs`, `CourseAssignmentEndpoints.cs`, `CourseAssignmentServiceTests.cs`

---

## Phase 3: 前端 UX 修復 [Medium]

### 3a. assign/unassign mutation 缺少錯誤處理 [S] ✅ 已完成
- **問題**: `BatchAssignmentByTeacherPanel.tsx:75-89` 無 `onError`，操作失敗無提示
- **修復**: 加 `onError` toast 提示
- **實作結果**: 已為指定/退回配課補上錯誤 toast；超過教師每週節數上限時仍維持 force 確認流程
- **檔案**: `src/schedule-web/src/components/setup/BatchAssignmentByTeacherPanel.tsx`

### 3b. 認領課程無 loading 指示 [S] ✅ 已完成
- **問題**: handleClaim 觸發後 dialog 立刻關閉，不等 mutation 完成
- **修復**: dialog 關閉後顯示 toast pending/success/error
- **實作結果**: 認領動作改為先關閉 dialog，再顯示 loading / success / error toast，讓使用者可追蹤操作狀態
- **檔案**: `BatchAssignmentByTeacherPanel.tsx`, `ClaimUnassignedDialog.tsx`

### 3d. 刪除條件過於嚴格 [M] ✅ 已完成
- **問題**: `canDelete` 要求無教師、非首列、多列同課程，使用者必須先切換到教師 tab 取消指定
- **修復**: 放寬為 `scheduledPeriods === 0` 即可刪除；或在班級 tab 加入 inline「取消教師」按鈕
- **實作結果**: 已放寬為既有且未排課的配課可直接於班級 tab 刪除，不再要求先取消指定教師
- **檔案**: `BatchAssignmentPanel.tsx:327-328`

---

## Phase 4: 前端效能 [Medium-Low, 可跳過]

### 4a. 每次按鍵都重繪整張表格 [M] ✅ 已完成
- **問題**: `updateRow` 每次產生新陣列，20+ 課程時全表重繪
- **修復**: 抽出 `React.memo` 包裝的 `AssignmentRow` 元件
- **實作結果**: 已將班級配課表列抽成 `React.memo` 的列元件，搭配穩定 callback 與 memoized options，降低單列編輯時的整表重繪
- **檔案**: `BatchAssignmentPanel.tsx`

### 4b. 為找未分配配課而拉取全部資料 [M] ✅ 已完成
- **問題**: `BatchAssignmentByTeacherPanel` 拉取全學期配課只為 filter `teacherId === null`
- **修復**: GET endpoint 加 `unassigned=true` 參數，server-side 過濾
- **實作結果**: 後端 `GET /course-assignments` 已支援 `unassigned=true`，前端改為直接取得未指定教師的配課；並補上 service 測試覆蓋
- **檔案**: `CourseAssignmentEndpoints.cs`, `client.ts`, `BatchAssignmentByTeacherPanel.tsx`

---

## Phase 5: 程式碼清理 [Low, 可跳過]

### 5a. 重複的 TypeScript 型別 [S]
- `CourseAssignment` 與 `CourseAssignmentProgress` 欄位相同 → 合併
- **檔案**: `src/schedule-web/src/api/types.ts`

### 5b. 未使用的 API 函式 [S]
- `createCourseAssignment`, `updateCourseAssignment`, `deleteCourseAssignment`, `batchTeacherCourseAssignments` 無任何元件 import → 刪除
- **檔案**: `src/schedule-web/src/api/client.ts`

### 5c. 不一致的 query key 格式 [S]
- 各面板用不同 key 結構，目前靠 prefix invalidation 運作但脆弱 → 統一格式
- **檔案**: 各面板元件 + `useCourseAssignments.ts`

---

## Phase 6: 測試補齊 [隨各 Phase 同步進行]

| 缺漏 | 對應 Phase | 工作量 |
|------|-----------|--------|
| `CopyToGradeAsync` 零測試 | Phase 2b | M |
| Excel 匯出零測試 | Phase 1b | S |
| `UnassignTeacherAsync` 不存在 ID 的驗證測試 | Phase 2c | S |

**已補齊**: `BatchByTeacherAsync`、Excel 匯入、DELETE endpoint

**檔案**: `tests/Schedule.Api.Tests/CourseAssignmentServiceTests.cs`, `tests/Schedule.Api.Tests/ExcelServiceTests.cs`, `tests/Schedule.Api.Tests/CourseAssignmentEndpointTests.cs`

---

## 建議的 PR 分組

| PR | 內容 | 工作量 |
|----|------|--------|
| PR1 | #1a + #2c: endpoint 安全性 + 測試（#1a 已完成） | S |
| PR2 | #1b: Excel 修復 + Excel 測試（已完成） | S |
| PR3 | #1c: MaxWeeklyPeriods + BatchByTeacher 測試（後端與測試已完成，前端 force UI 未完成） | M-L |
| PR4 | #2a + #2b + CopyToGrade 測試 | M |
| PR5 | #3a-3d: 前端 UX 批次修復 | M |
| PR6 | #4a + #4b: 前端效能 | M |
| PR7 | #5a-5c: 清理 | S |

## 最低限度 (時間有限時)
目前已完成 **1a + 1b + 1c + 2a + 2b + 2c + 3a + 3b + 3d**。若時間有限，下一步建議先做 **4b** 或 **5a**。

## 驗證方式
- Phase 1a: 建立有 TimetableSlot 的 CourseAssignment，呼叫 DELETE 應回 400
- Phase 1b: 用含空白教師欄的 Excel 匯入，確認建立 TeacherId=null 的配課
- Phase 1c: 設教師上限為 10，指定 12 節，應回傳錯誤；加 force=true 應通過
- Phase 3: 在逐師配課 tab 觸發失敗操作，確認 toast 顯示
- 所有修改後跑 `dotnet test` + `npm run build` 確認不破壞現有功能

## 已完成摘要
- 後端已完成 `1a`、`1b`、`1c`、`2a`、`2b`、`2c`
- 前端已完成 `3a`、`3b`、`3d`
- 前端/查詢效能已完成 `4a`、`4b`
- 已新增/擴充測試並通過 `dotnet test tests/Schedule.Api.Tests/Schedule.Api.Tests.csproj`
- 前端已同步 `force` 型別並通過 `npm run build`
- `force=true` 的互動式確認對話框仍待前端實作
