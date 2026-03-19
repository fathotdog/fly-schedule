# GUNZE 130th Anniversary — Design System 逆向工程報告

> 參考網站：https://www.gunze.co.jp/130th/
> 分析日期：2026-03-17
> 設計調性：節慶感插畫品牌 × 大膽鮮豔 × 動態敘事

---

## 1. Color Palette

### CSS Custom Properties（原始變數）

```css
--blue-color:   #1100ff
--blue-color02: #0040ff
--indigo-color: #6155f5
--mint-color:   #00c8b3
--orange-color: #ff9500
--pink-color:   #ff2d55
--hover-color:  #ff9500   /* 互動回饋色 */
--main-bg:      #ffffff
--main-color:   #000000
```

### 完整色票

#### Primary — 品牌藍
| Token | Hex | 用途 |
|-------|-----|------|
| `--blue-color` | `#1100ff` | 主品牌色、導覽列背景、CTA 按鈕 |
| `--blue-color02` | `#0040ff` | 漸層變化、邊框 |

#### Secondary — 靛紫（Business: Medical）
| Token | Hex | 用途 |
|-------|-----|------|
| `--indigo-color` | `#6155f5` | Business 板塊 #1、卡片背景 |

#### Accent — 多彩業務色系
| Token | Hex | 用途 |
|-------|-----|------|
| `--mint-color` | `#00c8b3` | Business 板塊 #2（Apparel）、清爽感 |
| `--orange-color` | `#ff9500` | Business 板塊 #3（Life）、Hover 狀態 |
| `--pink-color` | `#ff2d55` | Business 板塊 #4（Solution）、強調 |

#### Neutral
| Token | Hex | 用途 |
|-------|-----|------|
| `--main-bg` | `#ffffff` | 主背景 |
| `--main-color` | `#000000` | 主文字 |
| `—` | `#a27f48` | 金色裝飾文字（歷史感場景） |

#### Semantic / Interactive
| Token | Hex | 用途 |
|-------|-----|------|
| `--tap-highlight-color` | `rgba(255,255,255,.2)` | 觸控點擊高亮 |
| `--selection-color` | `rgba(51,153,255,.4)` | 文字選取範圍 |
| Focus Ring | `0 0 0 5px Canvas` | 無障礙焦點框 |

### 色彩規律解析
- **配色邏輯**：白底 × 純黑文字為基底，四個業務板塊各自對應一個高飽和度亮色（靛、薄荷、橘、粉紅），形成強對比的視覺分區。
- **主品牌藍** `#1100ff` 帶有微微紫紅偏移，比純藍更有個性。
- **無灰色系**：設計中幾乎不使用灰色中間調，刻意維持高對比張力。

---

## 2. Typography Scale

### 字型家族

| 角色 | Font Family | 字符特性 |
|------|-------------|---------|
| **UI 主字體（日文）** | `YakuHanJP, "Noto Sans JP", sans-serif` | 日文標點優化版，適合內文 |
| **UI 主字體（無標點修正）** | `"Noto Sans JP", sans-serif` | 標準日文 Sans |
| **展示標題（英文粗體）** | `Modak, system-ui` | 圓胖裝飾性，極具個性 |
| **展示標題（日文粗體）** | `Dela Gothic One, sans-serif` | 濃縮黑體，衝擊感強 |
| **優雅內文（英文）** | `EB Garamond, serif` | 古典優雅，歷史段落用 |
| **優雅內文（日文）** | `Shippori Mincho, serif` | 日文明朝體，質感敘事 |
| **裝飾 Sans（日文）** | `Shippori Antique B1, sans-serif` | 懷舊手感，特殊標語 |
| **數字 / 輔助（英文）** | `Inter, sans-serif` | 數據與介面輔助 |

### 字體尺寸系統

尺寸使用 `em` + `clamp()` + `vw` 流體設計，基準為 **16px @ 1440px viewport**。

```
根字體：font-size: clamp(90%, calc(16/1440*100vw), 100%)
        → 最小 14.4px，最大 16px，流體縮放
```

| 層級 | CSS 值 | 估算像素（16px基準） | 用途 |
|------|--------|---------------------|------|
| Hero Display | `7.5em` | ~120px | 主標語大字 |
| Section Title | `3em` | ~48px | 各節標題 |
| Sub Title | `2.25em` | ~36px | 副標 |
| Lead | `1.5em` | ~24px | 引言、大內文 |
| Body | `1em` | ~16px | 標準內文 |
| Caption | `0.75em` | ~12px | 說明文、版權 |
| Micro | `0.625em` | ~10px | Footer 法律文字 |

### Font Weight 使用範圍
`100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900`
→ 全量引入，展示字體（Modak、Dela Gothic One）預設極粗（900+），內文（Noto Sans JP）慣用 400。

### Line Height
| 情境 | 值 |
|------|-----|
| 大標（Display） | `1.0 ~ 1.2` |
| 標題（Heading） | `1.2 ~ 1.3` |
| 引言（Lead） | `1.5` |
| 內文（Body） | `1.75 ~ 1.8` |
| 長文段落 | `2.4` |

### Letter Spacing
| 情境 | 值 |
|------|-----|
| 英文標題縮緊 | `-0.01em` |
| 標準 | `0` |
| 日文微調 | `0.01em ~ 0.02em` |
| 特殊裝飾 | `0.08em` |

> `font-feature-settings: "palt"` 廣泛用於日文，自動修正標點間距。

---

## 3. Spacing System

### 基準與策略
- **基底單位：`em`（相對字體）**，而非固定 `px`
- **Layout 間距：`vw` 流體**，`calc(X/1440*100vw)` 推算比例
- 設計上**不使用固定 8px grid**，而是以字體倍數（`em`）構建間距韻律

### 常用間距值（em 系統）

| 等級 | em 值 | 估算 px | 用途場景 |
|------|--------|---------|---------|
| XS | `0.25em` | 4px | 圖示與文字的微間距 |
| S | `0.5em` | 8px | 行內元素間距 |
| M | `1em` | 16px | 標準間距單位 |
| L | `1.5em` | 24px | 段落間距、按鈕 padding |
| XL | `2.375em` | 38px | Section 內部 padding |
| 2XL | `3.75em` | 60px | 區塊間距 |
| 3XL | `5em` | 80px | 大節間距 |
| Hero | `20em+` | 320px+ | 巨型 Hero padding |

### Layout 容器寬度
```
--section-width:        1320px   ← 主要內容區
--section-narrow-width: 1200px   ← 窄版內容區
```

### Responsive 斷點
| 名稱 | 條件 | 說明 |
|------|------|------|
| Desktop Wide | `min-width: 801px` + `min-aspect-ratio: 1440/900` | 寬螢幕桌面 |
| Desktop | `min-width: 801px` | 一般桌面 |
| Tablet | `max-width: 1024px` | 平板 |
| Mobile | `max-width: 800px` | 主要手機斷點 |
| Small Mobile | `max-width: 540px` | 小螢幕手機 |
| XS Mobile | `max-width: 430px` | 最小螢幕 |

---

## 4. Border Radius

### 圓角規則

| 尺寸等級 | 值 | 估算 px | 適用元件 |
|---------|-----|---------|---------|
| None | `0` | 0 | 全出血圖片、方形容器 |
| XS | `0.25em` | 4px | 小型標籤（Tag）、Tooltip |
| S | `0.375em` | 6px | 小按鈕、Input |
| M | `0.625em` | 10px | 標準按鈕、卡片 |
| L | `0.9375em` | 15px | 中型卡片 |
| XL | `1.25em` | 20px | 大型卡片 |
| 2XL | `1.875em` | 30px | 業務板塊邊角 |
| 3XL | `2.5em` | 40px | 導覽選單面板（`.cm-nav`） |
| 4XL | `3.75em` | 60px | 超大圓角容器 |
| Pill | `100vmax` | 全圓 | 按鈕 Pill 形、膠囊型標籤 |

### 規律觀察
- 導覽浮層（Nav overlay）：`border-radius: 2.5em` → **強調漂浮感**
- 業務板塊（Business blocks）：`border-radius: 2.5em` → **柔和大圓角，友善感**
- 全圓（`100vmax`）廣泛用於 CTA 按鈕 → **品牌一致的圓潤風格**

---

## 5. Shadow / Elevation

### 陰影系統

這個網站的陰影設計極度**克制**：

| 層級 | CSS | 用途 |
|------|-----|------|
| Focus Ring | `box-shadow: 0 0 0 5px Canvas` | 無障礙焦點輪廓 |
| None | — | 幾乎無裝飾陰影 |

### Elevation 策略（非陰影方式）
- **顏色即層次**：不同業務板塊以飽和色塊疊加，以色彩而非陰影區分層級
- **Scale 動畫**：元素靠放大/縮小而非 z-index 陰影來表達前後關係
- **Sticky 堆疊**：業務板塊用 `position: sticky` + 遞增 `top` 值製造卡片堆疊感，無需陰影

> **設計決策**：扁平化 + 色彩分區取代傳統 Material Design 陰影層級系統。

---

## 6. 動效特徵

### 基礎 Transition
```css
--transition: .2s var(--ease-out-quart)
/* → 0.2s cubic-bezier(.165, .84, .44, 1) */
```

快速、有力的 ease-out，互動回饋感即時。

### Easing Function 完整庫

設計師定義了完整的 **16 個緩動函數**，精細程度媲美動畫工具庫：

#### Ease Out 系列（進場、滑入）
```css
--ease-out-quad:   cubic-bezier(.25, .46, .45, .94)
--ease-out-cubic:  cubic-bezier(.215, .61, .355, 1)
--ease-out-quart:  cubic-bezier(.165, .84, .44, 1)      ← 預設值
--ease-out-quint:  cubic-bezier(.23, 1, .32, 1)
--ease-out-sine:   cubic-bezier(.39, .575, .565, 1)
--ease-out-expo:   cubic-bezier(.19, 1, .22, 1)
--ease-out-circ:   cubic-bezier(.075, .82, .165, 1)
--ease-out-back:   cubic-bezier(.175, .885, .32, 1.275)  ← 帶彈性
```

#### Ease In-Out 系列（循環動畫）
```css
--ease-inout-quad:   cubic-bezier(.455, .03, .515, .955)
--ease-inout-cubic:  cubic-bezier(.645, .045, .355, 1)
--ease-inout-quart:  cubic-bezier(.77, 0, .175, 1)
--ease-inout-quint:  cubic-bezier(.86, 0, .07, 1)
--ease-inout-sine:   cubic-bezier(.445, .05, .55, .95)
--ease-inout-expo:   cubic-bezier(1, 0, 0, 1)            ← 最銳利
--ease-inout-circ:   cubic-bezier(.785, .135, .15, .86)
--ease-inout-back:   cubic-bezier(.68, -.55, .265, 1.55) ← 超出邊界彈跳
```

### 常見動畫模式

#### ① 滾動式視差（Scroll-driven）
- **Message 藍色圓形**：`scale: 1 → 6.4`（桌面）/ `8.77`（手機），滾動觸發
- **業務板塊堆疊**：4 塊卡片以 `position: sticky` 漸次堆疊

#### ② 文字跑馬燈（Marquee）
```css
@keyframes txt_marquee {
  0%  { transform: translate(0); }
  to  { transform: translate(-50%); }
}
/* duration: CSS var --marquee-duration（動態設定）, timing: linear, iteration: infinite */
```

#### ③ 永動旋轉（Rotation）
```css
@keyframes rotation {
  0%  { transform: rotate(0); }
  to  { transform: rotate(360deg); }
}
/* duration: 100s, timing: linear, iteration: infinite */
```
→ 用於 Hero 區的環形文字裝飾。

#### ④ 插圖角色肢體動畫（Limb Animation）
```css
/* 所有角色肢體動畫統一模式：0% → 50% → 100% 來回 */
@keyframes anim_futureperson_handl {
  0%  { rotate: 0deg;              translate: 0px 0px; }
  50% { rotate: var(--handl-rotate); translate: var(--handl-translatex) 0px; }
  to  { rotate: 0deg;              translate: 0px 0px; }
}
/* duration: ~1s, timing: ease-in-out, iteration: infinite */
```
→ 角色雙手、雙腳、頭部各自獨立動畫，CSS 變數控制幅度，高度模組化。

#### ⑤ 眨眼 & 眼球移動
```css
@keyframes mabataki {   /* 眨眼 */
  0%       { scale: 0; }
  3%, 49%  { scale: 1; }
  6%, 52%, to { scale: 0; }
}

@keyframes moveEye {    /* 眼球左右 */
  0%       { transform: translate(0); }
  6%, 46%  { transform: translate(var(--move-dist)); }
  52%, to  { transform: translate(0); }
}
```
→ 讓角色「活起來」的細膩細節，觸發感強。

#### ⑥ Hover 飛出效果
```css
@keyframes moveAndFadeHover {
  0%  { translate: 0px 0px;    opacity: 1; }
  40% { translate: 32% -32%;   opacity: .3; }
  45% { translate: 40% -40%;   opacity: 0; }
  46% { translate: -40% 40%;   opacity: 0; }
  to  { translate: 0px 0px;    opacity: 1; }
}
/* → 箭頭/圖示飛出後從對角線飛入，營造動感 */
```

#### ⑦ 背景橫向循環（Loop Background）
```css
@keyframes loop_yt_bg_pc {
  0%  { background-position: 0em center; }
  to  { background-position: -18.875em center; }
}
/* duration: 5~7s, timing: linear, iteration: infinite */
```

### Timing Summary
| 動畫類型 | Duration | Easing |
|---------|----------|--------|
| UI 互動回饋 | `0.2s` | ease-out-quart |
| 進場動畫 | `0.3s ~ 0.5s` | ease-out-sine / quint |
| Scale 互動 | `0.2s` | ease-inout-expo |
| 角色肢體 | `1s` | ease-in-out |
| 歷史頁面翻動 | `5s` | ease-in-out |
| 旋轉裝飾 | `100s` | linear |
| 背景循環 | `5~7s` | linear |
| 跑馬燈 | 動態（`var(--marquee-duration)`） | linear |

### Accessibility
```css
@media (prefers-reduced-motion) {
  /* 所有動畫停用 */
}
```
→ 完整支援減少動態偏好設定。

---

## 7. Brand Personality

### 5 個品牌關鍵詞

```
① 不可思議（Unpredictable）
② 大膽鮮豔（Bold & Vibrant）
③ 溫暖親切（Warm & Playful）
④ 歷史厚度（Heritage）
⑤ 未來前瞻（Forward-looking）
```

### 視覺元素與調性對應

| 視覺元素 | 傳遞的感覺 |
|---------|-----------|
| 核心標語「読めない、GUNZE」（Unreadable / Unpredictable） | 挑釁式自我解構，打破百年老牌的保守印象 |
| 純藍 `#1100ff` 主色，接近「危險」的電子藍 | 非傳統企業藍，帶有數位感與前衛性 |
| Modak + Dela Gothic One 超粗圓胖字 | 節慶感、可愛感，降低距離感 |
| 4 色高飽和業務板塊（靛/薄荷/橘/粉） | 多元包容，每個事業體有自己的個性 |
| 插圖角色全身動態動畫（眨眼、走路、揮手） | 「活生生的品牌」，擬人化企業形象 |
| EB Garamond + Shippori Mincho 搭配使用 | 130 年歷史厚度，在現代設計中保留傳統溫度 |
| 跑馬燈 + 旋轉 + Scroll-driven 視差 | 充滿動能，不是靜態品牌頁面，是「體驗」 |
| 業務板塊 sticky 堆疊 + 圓角大卡片 | 現代感、空氣感，避免生硬企業感 |
| 金色 `#a27f48` 在歷史段落出現 | 時間感、珍貴感、懷舊溫暖 |
| 無陰影扁平設計 | 乾淨俐落，色彩本身就是語言 |

### 設計調性總結

> GUNZE 130 周年網站是一個「**用插畫語言說歷史、用動畫語言說未來**」的品牌體驗網站。
> 它刻意放棄傳統日本企業網站的保守穩重，選擇以**大膽用色 × 擬人角色 × 充滿動能的動效**重新詮釋百年品牌。
> 「読めない（Unpredictable）」不只是標語，更是整個設計系統的核心邏輯——
> 你永遠不知道下一個 scroll 會帶出什麼驚喜。

---

*本報告透過視覺逆向工程分析，資料來源為網站公開 CSS 與 HTML 結構。*
