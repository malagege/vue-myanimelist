# 我的新番清單：前端重構功能規格

> 文件狀態：Draft v0.1  
> 建立日期：2026-07-11  
> 適用專案：`vue-myanimelist`

## 1. 文件目的

本文件先記錄目前程式已提供的功能，再定義重構後應保留、修正與補齊的行為。重構的第一目標不是改版，而是讓動畫資料、使用者選擇、排名、設定與分享連結各自有清楚的資料模型和責任邊界。

文件標記：

- **現況**：由目前程式碼確認的行為，不代表行為一定合理。
- **目標**：重構後應達成且可測試的行為。
- **待確認**：需要產品決策，問題統一列在文件最後。

## 2. 產品範圍

### 2.1 產品目標

1. 更新並展示各季新番資料。
2. 讓使用者標記自己有看的新番。
3. 讓使用者替動畫排名，並在跨季檢視時將排名結果集中顯示在上方。
4. 讓使用者儲存多組設定，之後可直接恢復，不必重新選擇和排名。
5. 讓使用者匯入、匯出設定檔。
6. 讓使用者以網址分享自己的動畫清單與排名，不依賴帳號或後端資料庫。

### 2.2 本次重構不包含

- 使用者帳號、登入或雲端同步。
- 後端短網址服務。
- MyAnimeList、AniList 等第三方帳號同步。
- 社群留言、按讚或多人共同編輯。
- 人工補齊所有歷史動畫的跨季關聯；但資料模型必須預留此能力。

## 3. 名詞與核心資料模型

目前的 `show`、`order` 與以動畫名稱當識別鍵的做法語意不清，重構後統一使用下列模型。實際實作可使用 TypeScript 型別和執行期 schema 驗證。

### 3.1 Season（季度）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | string | 穩定識別碼，例如 `2026-07` |
| `label` | string | 顯示名稱，例如 `2026年7月新番` |
| `year` | number | 年份 |
| `month` | `1 \| 4 \| 7 \| 10` | 開播季度月份 |
| `dataUrl` | string | 該季動畫資料檔位置 |

### 3.2 AnimeAppearance（動畫在某一季的資料）

同一部作品可能因跨季播出、延期或資料來源重複，而出現在多個季度。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `appearanceId` | string | 該筆季度資料的唯一識別碼，不使用顯示名稱直接配對 |
| `animeId` | string | 跨季作品識別碼；無法確認關聯時可先等同 `appearanceId` |
| `seasonId` | string | 所屬季度 |
| `title` | string | 中文顯示名稱 |
| `originalTitle` | string | 原文名稱 |
| `imageUrl` | string | 圖片網址 |
| `description` | string | 作品簡介 |
| `staff` | string | 製作人員資訊 |
| `officialUrl` | string | 官方網站 |
| `airDate` / `airTime` | string/null | 首播日期與時間 |
| `sourceOrder` | number | 資料來源中的原始順序 |

### 3.3 UserAnimeState（使用者狀態）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `animeId` | string | 對應動畫識別碼 |
| `watched` | boolean | 使用者是否標記為「有看」 |
| `rank` | number/null | 正整數名次；`null` 表示未排名 |

`watched` 與 `rank` 必須存放在使用者狀態中，不可直接寫回動畫主資料物件。

### 3.4 ListSnapshot（可分享／可儲存的清單快照）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `version` | number | 格式版本，用於向後相容與遷移 |
| `mode` | `season \| cross-season` | 單季或跨季清單 |
| `seasonIds` | string[] | 快照涉及的季度 |
| `entries` | UserAnimeState[] | 只保存已選取或已排名的最小資料 |

動畫圖片、簡介等公開主資料不放入分享網址或設定檔，以免網址過長。

### 3.5 SavedPreset（已儲存設定）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | string | 本機唯一識別碼，不以名稱當 key |
| `name` | string | 使用者自訂名稱 |
| `snapshot` | ListSnapshot | 深拷貝後的清單快照 |
| `createdAt` / `updatedAt` | ISO datetime | 建立與更新時間 |

## 4. 現有功能盤點

### 4.1 動畫資料更新

- **現況**：`npm run json-build` 先從 YuC's AnimeList 首頁解析季度清單。
- **現況**：每季優先讀取 ACGNTaiwan JSON；請求失敗時改抓 YuC 頁面並以 Cheerio 解析。
- **現況**：YuC 備援資料會透過 OpenCC 由簡體轉為台灣繁體。
- **現況**：產生的 `animeMenu.json` 與各季 JSON 同時寫入 `src/assets/json` 和 `public/src/assets/json`，兩份皆被 `.gitignore` 排除。
- **現況**：GitHub Actions 在每月 10、20 日、推送、PR 或手動觸發時更新資料、建置並部署 GitHub Pages。

### 4.2 單季清單

- **現況**：首頁導向資料選單中的最新季度。
- **現況**：使用者可由導覽列下拉選單切換季度。
- **現況**：每張卡片顯示動畫名稱、圖片，以及 `staff` 或 `description`。
- **現況**：左鍵點擊卡片切換 `show`，未選取卡片會覆蓋半透明黑色遮罩。
- **現況**：清單變更時，選取與排名資料會立即寫進目前網址的 hash。

### 4.3 跨季清單

- **現況**：`/all` 預設載入最新兩季；其他季度由點擊季度標題載入／展開。
- **現況**：所有 `show` 為真或有 `order` 的項目會再彙整到頁面最上方「我的排名清單」。
- **現況**：已載入的季度名稱會放入 `/all/:openAnimeList` 路徑，使用者狀態放在 hash。
- **現況**：上方彙整項目和原季度項目共用同一物件，因此操作其中一處會影響另一處。

### 4.4 排名

- **現況**：在動畫卡片按右鍵後，以瀏覽器 `prompt` 輸入名次。
- **現況**：名次直接寫入 `order`，同時作為 CSS Grid/Flex 的 `order` 值，數字較小者排前面。
- **現況**：名次會顯示在卡片右下角。
- **現況**：目前沒有正整數驗證、重複名次處理、清除名次的明確操作，也沒有行動裝置替代操作。

### 4.5 儲存設定

- **現況**：設定視窗可搜尋、另存、改名、讀取、覆蓋和刪除設定。
- **現況**：單季設定儲存在 `localStorage.MonthItem`；跨季設定儲存在 `localStorage.allItem`。
- **現況**：單季保存的是選取資料陣列；跨季保存的是 `{ path, hash }` 路由物件，兩者格式不一致。
- **現況**：設定只存在目前瀏覽器與目前網域，不會跨裝置同步。

### 4.6 匯入與匯出

- **現況**：每一筆設定可匯出為以設定名稱命名的 JSON 檔。
- **現況**：可選擇 JSON 檔匯入一筆設定。
- **現況**：匯入時只檢查頂層是否有 `name` 和 `settingVar`，沒有版本、欄位型別、檔案大小或內容上限驗證。

### 4.7 分享網址

- **現況**：JSON 先以 `js-base64` 轉成 URL-safe Base64，再存入 URL hash。
- **現況**：分享內容只包含動畫名稱、`show` 與 `order`，不包含圖片或簡介。
- **現況**：收件者開啟網址後，前端載入對應季度 JSON，再以動畫名稱套用分享狀態。
- **現況**：Base64 是編碼，不是加密；收到網址的人可以還原原始 JSON。
- **現況**：沒有格式版本、壞資料提示、舊格式遷移、解壓縮大小限制或 URL 過長提示。

## 5. 重構後功能需求

### FR-01 動畫資料更新

1. 提供單一明確指令（建議 `npm run data:update`）更新季度選單與動畫資料。
2. 保留「ACGNTaiwan 為主要來源、YuC 為備援來源」的現行策略，除非產品另行決定。
3. 抓取後必須執行 schema 驗證、欄位正規化、空值處理與穩定 ID 產生。
4. 單一來源或單一季度失敗時必須列出來源、季度與錯誤原因；不可只輸出成功 spinner。
5. 最新季度無資料、選單為空或輸出不符合 schema 時，命令必須以非零狀態結束，避免部署空站。
6. 產生檔只保留一份，建議置於 `public/data`，前端透過 `import.meta.env.BASE_URL` 組合網址。
7. 寫檔採暫存檔完成後再替換，避免中途失敗留下半套資料。
8. CI 使用與專案相容且仍受支援的 Node 版本、`npm ci`、快取與新版 Actions，資料更新和網站建置分開顯示結果。

### FR-02 季度導覽與載入

1. 預設開啟最新季度。
2. 使用者可從季度選單切換；網址必須能直接定位該季度。
3. 載入中顯示 loading；載入失敗顯示可重試錯誤，不可只寫 `console.log`。
4. 空資料顯示明確空狀態。
5. 季度資料按需載入並快取，同一次操作階段不可重複請求。
6. 非法季度路由導向最新季度或顯示 404，不可默默載入最新季但保留錯誤網址。

### FR-03 動畫卡片與「有看」狀態

1. 卡片至少顯示標題和圖片；簡介／staff 的優先規則需一致。
2. 使用者可切換「有看」狀態，視覺上清楚區分已選與未選。
3. 狀態操作不得修改動畫主資料，只更新 `UserAnimeState` store。
4. 圖片載入失敗時顯示本地 placeholder，並保留動畫標題。
5. 桌面、平板和手機皆不可因固定四欄或最小寬度產生無意義的水平捲動。
6. 卡片可由鍵盤操作，狀態不只靠顏色或遮罩表達。

### FR-04 排名操作

1. 桌面保留右鍵開啟排名操作；同時提供可發現、可觸控、可鍵盤操作的選單或控制項。
2. 名次只接受正整數；取消操作不得改變原名次。
3. 使用者可清除名次。
4. 排序規則固定為：已排名項目依名次升冪、已選但未排名項目依來源順序、其餘項目依來源順序。
5. 顯示名次時必須有文字／輔助技術可讀資訊，不只使用 CSS pseudo-element。
6. 重複名次與「排名是否必須先標記有看」的規則待確認。

### FR-05 跨季清單與頂部排名區

1. 跨季頁可展開或收合各季度，季度資料採 lazy load。
2. 頁面上方固定有彙整區，顯示跨季已排名項目；是否也顯示「有看但未排名」待確認。
3. 同一動畫跨季出現時，彙整區依 `animeId` 去重；無法確認同一作品時不得只靠相同顯示名稱強制合併。
4. 彙整區與季度清單讀取同一份正規化狀態，但元件不可直接互相修改 props。
5. 收合季度只影響畫面狀態，不得刪除使用者選擇或排名。
6. 分享與設定只保存有產品意義的季度和使用者狀態，不把「曾經載入過」誤當分享內容。

### FR-06 儲存與恢復設定

1. 使用者可建立多筆命名設定，名稱去除前後空白且不可為空。
2. 可搜尋、讀取、改名、覆蓋與刪除設定；覆蓋和刪除需有確認或可復原機制。
3. 另存和覆蓋時必須保存 snapshot 深拷貝，後續編輯目前清單不可連帶修改已儲存設定。
4. 讀取前先驗證並遷移格式；未知版本不可破壞現有資料。
5. 所有設定統一使用 `SavedPreset` schema；單季與跨季差異由 `snapshot.mode` 表示。
6. `localStorage` 存取集中在 repository/service；quota、JSON 損壞或瀏覽器禁止儲存時顯示錯誤。
7. 本機儲存 key 必須含 schema 版本，例如 `anime-list:presets:v2`。
8. 讀取舊的 `MonthItem` 與 `allItem` 並遷移，完成前不可直接刪除舊資料。

### FR-07 匯入與匯出設定檔

1. 單筆設定可匯出為 UTF-8 JSON，內容使用 `SavedPreset` schema 並帶格式版本。
2. 檔名中的 Windows/macOS 禁止字元需替換，空名稱使用安全預設值。
3. 匯入只接受合理大小的 JSON 檔，解析後執行 schema 驗證。
4. 無效檔案需顯示可理解的原因，且不得寫入任何部分資料。
5. 匯入成功後建立新的本機 ID，避免覆蓋既有設定；同名處理方式待確認。
6. 匯入目前舊格式 `{ name, settingVar }` 時，應透過 legacy adapter 轉成新格式。

### FR-08 產生分享網址

1. 提供明確的「複製分享連結」操作和成功／失敗回饋，不要求使用者自行從網址列複製。
2. 分享 snapshot 必須包含版本、模式、相關季度、動畫穩定 ID、「有看」狀態與排名。
3. URL 不包含動畫主資料、設定名稱或其他非必要資訊。
4. 編碼流程採「版本化 JSON -> UTF-8 -> DEFLATE -> Base64url」。
5. 建議格式為 `v2.<base64url payload>`；`v2` 讓解碼器選擇正確演算法和 schema。
6. GitHub Pages 繼續使用 hash history；分享 payload 建議放在 hash route 的 query，例如 `/#/season/2026-07?share=v2...`，避免目前雙 hash 語意。
7. 產生後檢查完整 URL 長度；超過產品門檻時提示連結可能被聊天軟體或中介系統截斷，並建議改用匯出檔。

### FR-09 開啟分享網址

1. 解碼流程必須捕捉無效 Base64、解壓失敗、JSON 錯誤、未知版本和 schema 錯誤。
2. 解壓前後設置輸入與輸出大小上限，避免惡意 payload 消耗過多記憶體。
3. 先載入 snapshot 指定的季度，再依穩定 ID 套用狀態。
4. 找不到的動畫列入「無法還原」提示，其餘有效項目仍可顯示。
5. 舊版無前綴 Base64 連結繼續支援：先用 legacy decoder 解出 `{ name, show, order }`，再轉成新狀態。
6. 舊資料以名稱配對時，如同季有多筆或跨季有歧義，不可靜默套用到所有同名動畫。
7. 分享頁是否唯讀待確認；若允許編輯，修改應建立收件者自己的 snapshot，不可暗示會改到分享者資料。

### FR-10 路由與相容性

1. 新路由建議使用 `/season/:seasonId`、`/cross-season`，保留清楚且不含本地化顯示名稱的參數。
2. 舊 `/YYYYMM` 與 `/all/:openAnimeList` 連結由相容層解析並導向新模型。
3. 路由只負責可分享的導覽狀態；彈窗開關、loading 等暫時 UI 狀態不寫入網址。
4. 頁面切換和只更新分享 query 必須走同一套 restore 流程，不重複撰寫解碼程式。

## 6. Pako／URL 壓縮評估

### 6.1 結論

建議採用 `pako` 的 raw DEFLATE（`deflateRaw`／`inflateRaw`）壓縮 snapshot，再把壓縮後的 bytes 轉成 Base64url。`nodeca` 是維護 `pako` 的組織名稱，要安裝的 npm 套件是 `pako`。

Base64 仍需保留在最後一步，因為壓縮結果是任意二進位資料，不能安全地直接放進 URL。這項變更是「壓縮後再編碼」，不是以 pako 取代 Base64，也不提供保密性。

### 6.2 目前資料的實測

以下使用專案現有動畫名稱，payload 欄位維持目前的 `name/show/order`，以 Node zlib 的 raw DEFLATE 模擬與 pako 相容的輸出。數字是 payload 字元數，不含網域與路由。

| 項目數 | 現行 Base64url | DEFLATE + Base64url | 減少 |
| ---: | ---: | ---: | ---: |
| 1 | 82 | 86 | -4.9% |
| 5 | 355 | 206 | 42.0% |
| 10 | 790 | 427 | 45.9% |
| 20 | 1,575 | 734 | 53.4% |
| 50 | 4,030 | 1,664 | 58.7% |
| 100 | 7,979 | 3,042 | 61.9% |

判讀：只有一筆時壓縮 header／資料結構會造成些微反效果，但一般清單從 5 筆開始已有明顯收益。跨季 100 筆即使壓縮後仍約 3,000 字元，所以 pako 能降低風險，不能保證所有平台都接受任意長度網址。

### 6.3 為何本案優先選 pako

- pako 是瀏覽器可用的 zlib 實作，可直接處理字串與 `Uint8Array`；官方說明提供 deflate/inflate 與分段 API。
- 官方目前說明完整 minified bundle gzip 後小於 15 KB；本功能只需要 deflate/inflate，可再確認 tree-shaking 後的實際 bundle。
- npm latest 已於 2026-07-06 更新為 `3.0.1`，無 runtime dependencies，並內建 TypeScript declarations。因 3.x 是剛發布的 major version，而本專案仍使用 Vite 2，導入前要先做最小相容性 spike、鎖定確切版本並驗證 production bundle；若遇到舊工具鏈相容問題，只能暫時固定 2.1.x 並另外排定工具鏈升級，不應無期限停在舊版。
- 瀏覽器原生 `CompressionStream`／`DecompressionStream` 自 2023 年 5 月起已廣泛可用，且可省依賴；但 API 為非同步 stream，仍需先決定最低瀏覽器版本。若產品只支援現代瀏覽器，可在實作前做一次 bundle 與相容性比較，再決定是否改用原生 API。

目前建議先用 pako，原因是它能提供一致、容易測試的同步 codec，適合這個小型 payload 與舊專案的漸進式遷移。若後續確認最低版本為 Chrome/Edge 103、Firefox 113、Safari/iOS 16.4 或更新版本，可再考慮原生 `CompressionStream('deflate-raw')`。

### 6.4 Codec 規格

```text
encode(snapshot)
  -> validate and normalize
  -> JSON.stringify
  -> UTF-8 bytes
  -> DEFLATE raw
  -> Base64url without padding
  -> "v2." + payload

decode(value)
  -> detect version prefix
  -> Base64url to bytes
  -> INFLATE raw with size limit
  -> UTF-8 JSON
  -> parse and schema validate
  -> migrate to current ListSnapshot
```

相同 snapshot 的 encoder 輸出應固定，方便測試與除錯。codec 不得依賴 Vue、router、store 或 DOM。

參考資料：

- [pako 官方 GitHub](https://github.com/nodeca/pako)
- [pako npm 套件](https://www.npmjs.com/package/pako)
- [MDN Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API)

## 7. 建議程式架構

```text
src/
  app/
    router/
    App.vue
  domain/
    anime.ts
    season.ts
    snapshot.ts
    preset.ts
    schemas.ts
  stores/
    animeCatalog.ts
    userList.ts
    presets.ts
  services/
    animeRepository.ts
    presetRepository.ts
    shareCodec.ts
    legacyShareCodec.ts
    fileTransfer.ts
  features/
    season-list/
    cross-season-list/
    ranking/
    presets/
    sharing/
  components/
    AnimeCard.vue
    AnimeGrid.vue
    AppHeader.vue
    AppFooter.vue
  pages/
    SeasonPage.vue
    CrossSeasonPage.vue
    NotFoundPage.vue
scripts/
  data-update/
public/
  data/
    seasons.json
    seasons/*.json
tests/
```

架構原則：

1. 頁面負責組合 use case，不直接做 Base64、localStorage、FileReader 或 HTTP 細節。
2. store 保存正規化的 catalog 與 user state；元件以事件要求變更，不直接 mutate props。
3. `shareCodec`、`presetRepository` 和動畫資料 repository 都是可獨立單元測試的純邊界。
4. 單季與跨季共用同一套卡片、狀態、排序和 codec，不再各自複製載入與 hash 邏輯。
5. 可採 Pinia 管理跨頁共享狀態；若不引入 Pinia，也必須以單一 composable/store 完成相同責任，不可回到多層事件與物件直接突變。
6. 先建立行為測試再升級 Vue、Vite、Bootstrap 等大版本，避免把框架升級與產品行為修正混在同一批變更。

## 8. 重構階段

### Phase 0：固定現況與決策

- 回答第 11 節產品問題。
- 建立現況 smoke test、舊分享連結 fixtures、舊設定 fixtures。
- 記錄目前最新季、單季選取、跨季排名、設定存讀及匯入匯出的操作結果。

### Phase 1：建立 domain 與相容層

- 建立 Season、AnimeAppearance、UserAnimeState、ListSnapshot、SavedPreset 型別與 schema。
- 建立 v2 pako codec、legacy Base64 decoder 及 round-trip tests。
- 建立舊 `MonthItem`／`allItem` 設定遷移器。

### Phase 2：重做狀態與資料存取

- 將動畫主資料和使用者狀態分離。
- 建立 repository、store、排序 selector 與跨季去重 selector。
- 移除頁面中的 axios、Base64、localStorage 和直接 props mutation。

### Phase 3：重做主要畫面

- 完成季度頁、跨季頁、頂部排名區與響應式卡片。
- 補齊 loading、empty、error、圖片失敗、鍵盤與觸控操作。
- 加入清楚的分享按鈕和還原錯誤提示。

### Phase 4：設定與檔案交換

- 以統一 schema 重做另存、覆蓋、刪除、搜尋、匯入和匯出。
- 啟用 legacy migration，驗證舊設定不遺失。

### Phase 5：資料管線與工具鏈

- 合併重複輸出、加入 schema 驗證、穩定 ID、atomic write 和 fixtures。
- 更新 CI/Node/Actions 與依賴；每一類升級分開提交並跑完整測試。

### Phase 6：移除舊碼

- 觀察 legacy 連結和設定遷移結果後，移除重複頁面邏輯、未使用元件與 debug log。
- legacy decoder 是否移除及保留多久，依產品決策執行。

## 9. 測試與驗收

### 9.1 單元測試

- v2 codec 對中文、日文、emoji、空清單、大清單可 round trip。
- legacy Base64 單季／跨季 fixtures 可還原。
- 損壞、截斷、未知版本及解壓超限 payload 被安全拒絕。
- 排名排序在不同輸入順序下結果固定。
- 動畫跨季去重不依賴顯示名稱。
- preset create/read/update/delete、deep copy 與舊格式 migration 正確。
- 資料更新 parser 使用固定 HTML/JSON fixtures 測主要來源與備援來源。

### 9.2 元件測試

- 點擊、右鍵、鍵盤與觸控皆能完成選取／排名。
- 取消排名輸入不改狀態，非法名次顯示驗證訊息。
- 載入、空清單、資料錯誤與圖片錯誤狀態正確。
- 讀取或覆蓋 preset 不會因物件引用改到原 preset。

### 9.3 E2E 測試

1. 最新季度可載入、切換季度並以網址直接開啟。
2. 選取和排名後複製分享連結，在新的瀏覽器 context 可還原相同畫面。
3. 舊格式分享連結仍可還原。
4. 跨季排名在上方依規則排序，收合季度不影響結果。
5. 建立設定、重新整理、讀取、覆蓋、匯出、刪除與再匯入均成功。
6. 在手機與桌面 viewport 無控制項重疊、文字溢出或非預期水平捲動。

### 9.4 建置基線

目前 `npm run build` 可成功完成。重構期間每個 phase 都必須維持 production build、單元測試和 E2E smoke test 通過。

## 10. 已發現且重構必須處理的風險

1. 無分享 hash 時仍執行 `JSON.parse('')`，目前只由 promise catch 隱藏錯誤。
2. 動畫名稱被當作跨季識別鍵。現有 28 季、1,620 筆資料中有 15 個名稱重複，可能誤套分享狀態或重複顯示。
3. `show` 與 `order` 直接寫進來源資料，且上方清單與季度清單共享引用，資料流不可預測。
4. 排名是任意 prompt 字串，可能得到 0、負數、文字、空字串或重複名次。
5. 單季與跨季設定保存完全不同的資料型態，但元件 props 宣告未反映差異。
6. 新增／覆蓋設定保存現有物件引用，可能被後續操作連帶修改。
7. 跨季分享路徑保存的是「已載入季度」而非「清單真正使用的季度」。
8. `animeMenu` 被元件直接加入 `show` 並修改，是共享 import，跨頁生命週期可能殘留 UI 狀態。
9. 產生資料同時寫入 `src` 與 `public`，增加路徑和部署環境不一致的風險。
10. 匯入、分享 decode 和解壓若沒有大小及 schema 限制，可能造成瀏覽器卡頓或記憶體問題。
11. 固定四欄和卡片 `min-width: 275px` 不適合窄螢幕；右鍵排名在觸控裝置不可用。
12. 分享資料沒有版本，改格式或改名後無可靠遷移方式。

## 11. 待一起確認的產品問題

1. 左鍵目前代表的 `show`，正確文案是「有看」、「正在看」、「想看」，還是泛用的「選取」？是否需要多狀態（想看／觀看中／看完／棄番）？
2. 排名是否只能套用在已標記「有看」的作品？目前可以只排名但不勾選。
3. 可否有重複名次？若輸入已存在的名次，要拒絕、交換名次，還是自動將後面的名次順延？
4. 清除名次的預期操作是右鍵選單中的「清除」、輸入空白，還是另有按鈕？
5. 跨季頁上方是「所有季度共用一份總排名」，還是「每季各自排名後，把各季排名區塊放上方」？目前程式實際上是所有已載入季度合成一份。
6. 上方「我的排名清單」是否只放有名次的作品，還是也放有看但未排名的作品？目前兩者都放。
7. 同一作品因跨季播出或延期而出現在兩季時，上方應合併成一張卡嗎？若排名是在延期前建立，是否應自動沿用到新季度？
8. 現有資料中的同名項目不一定都是同一部作品。是否接受維護一份人工 alias／canonical ID 對照表？
9. `/all` 預設載入最新兩季是否是產品需求？跨季可選範圍是全部歷史季度、最近一年，還是由使用者指定？
10. 單季 preset 是否必須綁定原季度？目前單季設定沒有季度資訊，在其他季度讀取時只會嘗試比對同名動畫。
11. 分享連結的收件者應只能觀看，還是可以直接修改並產生自己的分享連結？
12. 分享內容是否需要包含季度展開／收合狀態，還是只分享有看與排名資料？本規格建議不分享純 UI 狀態。
13. 舊 Base64 分享連結需要永久支援，還是設定一個停止支援日期？
14. 超過建議 URL 長度時，是否只提示改用 JSON 匯出即可？若一定要分享長清單，後續就需要短網址／雲端 snapshot 服務。
15. 匯入同名 preset 時要允許並存、自動改名，還是詢問是否覆蓋？
16. 動畫資料來源優先順序是否確定維持 ACGNTaiwan -> YuC？資料更新頻率是否仍為每月 10、20 日？
17. 需要支援的最低瀏覽器版本為何？這會影響採 pako 或原生 Compression Streams，以及右鍵／觸控操作的測試矩陣。
18. 分享網址與設定檔是否視為公開資料？若未來加入私人備註，必須另做真正的加密或改由有權限的後端保存，不能把 Base64／壓縮視為保密。
