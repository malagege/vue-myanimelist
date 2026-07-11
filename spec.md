# 我的新番清單：前端重構功能規格

> 文件狀態：Draft v0.3（需求已確認）
> 建立日期：2026-07-11
> 適用專案：`vue-myanimelist`

## 1. 文件目的

本文件先記錄目前程式已提供的功能，再定義重構後應保留、修正與補齊的行為。重構的第一目標不是改版，而是讓動畫資料、使用者選擇、排名、設定與分享連結各自有清楚的資料模型和責任邊界。

文件標記：

- **現況**：由目前程式碼確認的行為，不代表行為一定合理。
- **目標**：重構後應達成且可測試的行為。
- **決策**：已由產品確認並納入目標需求的規則，集中記錄於第 11 節。

## 2. 產品範圍

### 2.1 產品目標

1. 更新並展示各季新番資料。
2. 讓使用者以「想看／觀看中／看完／棄番」記錄新番觀看狀態。
3. 讓使用者替動畫排名，並在跨季檢視時將排名結果集中顯示在上方。
4. 讓使用者儲存多組設定，之後可直接恢復，不必重新選擇和排名。
5. 讓使用者匯入、匯出設定檔。
6. 讓使用者以網址分享自己的動畫清單與排名，不依賴帳號或後端資料庫。

### 2.2 本次重構不包含

- 使用者帳號、登入或雲端同步。
- 後端短網址服務。
- MyAnimeList、AniList 等第三方帳號同步。
- 社群留言、按讚或多人共同編輯。
- 人工補齊歷史動畫的跨季關聯、alias 或 canonical ID 對照表。

## 3. 名詞與核心資料模型

目前的 `show`、`order` 語意不清，重構後統一使用下列模型。依產品決策，動畫狀態與分享資料暫時仍以名稱配對，不建立人工 alias 或 canonical ID。實際實作可使用 TypeScript 型別和執行期 schema 驗證。

### 3.1 Season（季度）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | string | 穩定識別碼，例如 `2026-07` |
| `label` | string | 顯示名稱，例如 `2026年7月新番` |
| `year` | number | 年份 |
| `month` | `1 \| 4 \| 7 \| 10` | 開播季度月份 |
| `dataUrl` | string | 該季動畫資料檔位置 |

### 3.2 AnimeAppearance（動畫在某一季的資料）

同一部作品可能因跨季播出、延期或資料來源重複，而出現在多個季度。本階段不判定這些項目是否為同一作品。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `seasonId` | string | 所屬季度 |
| `name` | string | 中文顯示名稱，也是目前設定與分享狀態的配對鍵 |
| `originalTitle` | string | 原文名稱 |
| `imageUrl` | string | 圖片網址 |
| `description` | string | 作品簡介 |
| `staff` | string | 製作人員資訊 |
| `officialUrl` | string | 官方網站 |
| `airDate` / `airTime` | string/null | 首播日期與時間 |
| `sourceOrder` | number | 資料來源中的原始順序 |

元件需要唯一 key 時使用 `seasonId + name` 的組合；設定與分享還原仍只用 `name` 配對。跨季有多筆同名資料時，名稱命中的項目都可能套用同一狀態並重複出現在彙整清單；本階段不合併、不去重，也不進行人工關聯維護。名稱變更或同名碰撞是已接受限制。

### 3.3 UserAnimeState（使用者狀態）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `name` | string | 用於配對動畫的顯示名稱 |
| `status` | `unselected \| planned \| watching \| completed \| dropped` | 未選取／想看／觀看中／看完／棄番 |
| `rank` | string/null | 使用者輸入的名次；`null` 表示未排名 |

`status` 與 `rank` 必須存放在使用者狀態中，不可直接寫回動畫主資料物件。任何非 `unselected` 的動畫，以及雖未選狀態但已有 `rank` 的動畫，都會進入上方彙整清單。

### 3.4 ListSnapshot（可分享／可儲存的清單快照）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `version` | number | 格式版本，用於向後相容與遷移 |
| `mode` | `season \| cross-season` | 單季或跨季清單 |
| `seasonIds` | string[] | 快照涉及的季度 |
| `entries` | UserAnimeState[] | 只保存非 `unselected` 或已有排名的最小資料 |

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
2. ACGNTaiwan 是唯一動畫資料來源；完全移除 YuC 首頁解析、HTML 備援與 YuC 圖片／文字資料依賴。
3. 季度選單不再由外部網站解析。以可設定的起始季度（現有資料起點為 `2019-10`）按每年 `1/4/7/10` 月產生到當前季度；輸出順序由新到舊。
4. 抓取後必須執行 schema 驗證、欄位正規化與空值處理；本階段不建立跨季作品 ID。
5. 單一季度失敗時必須列出來源、季度與錯誤原因；不可只輸出成功 spinner，也不可用空陣列覆蓋上次成功資料。
6. 最新季度無資料、選單為空或輸出不符合 schema 時，命令必須以非零狀態結束，避免部署空站。
7. 產生檔只保留一份，建議置於 `public/data`，前端透過 `import.meta.env.BASE_URL` 組合網址。
8. 寫檔採暫存檔完成後再替換，避免中途失敗留下半套資料。
9. CI 使用與專案相容且仍受支援的 Node 版本、`npm ci`、快取與新版 Actions，資料更新和網站建置分開顯示結果。
10. 自動更新排程維持每月 10、20 日；同時保留推送、PR 與手動觸發。

### FR-02 季度導覽與載入

1. 預設開啟最新季度。
2. 使用者可從季度選單切換；網址必須能直接定位該季度。
3. 載入中顯示 loading；載入失敗顯示可重試錯誤，不可只寫 `console.log`。
4. 空資料顯示明確空狀態。
5. 季度資料按需載入並快取，同一次操作階段不可重複請求。
6. 非法季度路由導向最新季度或顯示 404，不可默默載入最新季但保留錯誤網址。

### FR-03 動畫卡片與觀看狀態

1. 卡片至少顯示標題和圖片；簡介／staff 的優先規則需一致。
2. 使用者可設定未選取、想看、觀看中、看完或棄番；各狀態需有清楚文字與視覺區分。
3. 左鍵點擊卡片時直接依序循環 `未選取 -> 想看 -> 觀看中 -> 看完 -> 棄番 -> 未選取`，不開啟狀態選單。
4. 狀態操作不得修改動畫主資料，只更新 `UserAnimeState` store。
5. 圖片載入失敗時顯示本地 placeholder，並保留動畫標題。
6. 桌面、平板和手機皆不可因固定四欄或最小寬度產生無意義的水平捲動。
7. 卡片可由鍵盤操作，Enter／Space 採用相同循環規則；狀態不只靠顏色或遮罩表達。

### FR-04 排名操作

1. 桌面保留右鍵開啟排名操作；同時提供可發現、可觸控、可鍵盤操作的選單或控制項。
2. 不要求名次唯一、連續或從 1 開始，也不因格式不符阻擋保存。
3. 可轉為有限數字的名次依數值升冪排列；相同名次依來源順序保持穩定。無法轉成數字的輸入列在數字名次之後，再依來源順序排列。
4. 桌面右鍵 prompt 輸入空白並確認時清除名次；按取消則保留原值。觸控／鍵盤操作選單另提供明確的「清除名次」。
5. 顯示名次時必須有文字／輔助技術可讀資訊，不只使用 CSS pseudo-element。
6. 動畫只要有觀看狀態或已有名次，就會出現在上方彙整清單；不強制先設定觀看狀態才能輸入名次。

### FR-05 跨季清單與頂部排名區

1. 跨季頁預設比較目前最新兩季；由設定或分享還原時，則載入 snapshot 記錄的兩季。每季區塊可展開或收合，資料採 lazy load。
2. 頁面上方只有一份跨兩季共用的彙整清單，包含所有已選觀看狀態或已有名次的作品；有名次者先排序，未排名者其後依來源順序排列。
3. 同名動畫一律依名稱套用狀態，不判斷跨季同名項目是否為同一作品，也不做 canonical 去重；同名項目可能重複顯示，視為本階段已接受限制。
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
9. 單季 preset 必須記錄並綁定原季度；讀取時先開啟該季度，再以動畫名稱套用狀態。跨季 preset 記錄其比較的兩季。

### FR-07 匯入與匯出設定檔

1. 單筆設定可匯出為 UTF-8 JSON，內容使用 `SavedPreset` schema 並帶格式版本。
2. 檔名中的 Windows/macOS 禁止字元需替換，空名稱使用安全預設值。
3. 匯入只接受合理大小的 JSON 檔，解析後執行 schema 驗證。
4. 無效檔案需顯示可理解的原因，且不得寫入任何部分資料。
5. 匯入成功後建立新的本機 ID，避免覆蓋既有設定；允許多筆同名 preset 並存。
6. 匯入目前舊格式 `{ name, settingVar }` 時，應透過 legacy adapter 轉成新格式。

### FR-08 產生分享網址

1. 提供明確的「複製分享連結」操作和成功／失敗回饋，不要求使用者自行從網址列複製。
2. 分享 snapshot 必須包含版本、模式、相關季度、動畫名稱、觀看狀態與排名。
3. URL 不包含動畫主資料、設定名稱或其他非必要資訊。
4. 編碼流程採「版本化 JSON -> UTF-8 -> DEFLATE -> Base64url」。
5. 建議格式為 `v2.<base64url payload>`；`v2` 讓解碼器選擇正確演算法和 schema。
6. GitHub Pages 繼續使用 hash history；分享 payload 建議放在 hash route 的 query，例如 `/#/season/2026-07?share=v2...`，避免目前雙 hash 語意。
7. 本階段不提供 URL 長度警告、短網址或因過長改用匯出檔的引導；仍以最小 snapshot 和 pako 壓縮控制長度。

### FR-09 開啟分享網址

1. 解碼流程必須捕捉無效 Base64、解壓失敗、JSON 錯誤、未知版本和 schema 錯誤。
2. 解壓前後設置輸入與輸出大小上限，避免惡意 payload 消耗過多記憶體。
3. 先載入 snapshot 指定的季度，再依動畫名稱套用狀態。
4. 找不到的動畫列入「無法還原」提示，其餘有效項目仍可顯示。
5. 不支援目前無版本前綴的純 Base64 JSON 分享連結；新版本上線後直接改用 pako 格式。
6. 名稱在同季或跨季發生碰撞時不做額外判斷，接受名稱配對的現階段限制。
7. 收件者可修改分享清單並產生自己的分享連結；所有修改只存在收件者網址／瀏覽器，不會影響原分享者。
8. 由分享連結開啟跨季頁時，先只顯示上方彙整清單，兩個季度區塊預設收合；收件者之後可自行展開或再次收合。

### FR-10 路由與相容性

1. 新路由建議使用 `/season/:seasonId`、`/cross-season`，保留清楚且不含本地化顯示名稱的參數。
2. 舊 `/YYYYMM` 與 `/all/:openAnimeList` 路由可由相容層導向新頁面，但不解析舊純 Base64 分享 payload。
3. 路由只負責可分享的導覽狀態；彈窗開關、loading 等暫時 UI 狀態不寫入網址。
4. 頁面切換和只更新分享 query 必須走同一套 restore 流程，不重複撰寫解碼程式。

## 6. Pako／URL 壓縮評估

### 6.1 結論

建議採用 `pako` 的 raw DEFLATE（`deflateRaw`／`inflateRaw`）壓縮 snapshot，再把壓縮後的 bytes 轉成 Base64url。`nodeca` 是維護 `pako` 的組織名稱，要安裝的 npm 套件是 `pako`。

Base64 仍需保留在最後一步，因為壓縮結果是任意二進位資料，不能安全地直接放進 URL。這項變更是「壓縮後再編碼」，不是以 pako 取代 Base64，也不提供保密性。

產品決策中的「棄用 Base64」是指棄用目前「JSON 直接做 Base64url」的舊分享格式與 `js-base64` 流程；新格式仍須在 pako 之後做 Base64url transport encoding。舊分享連結不設相容期。

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
- 瀏覽器原生 `CompressionStream`／`DecompressionStream` 自 2023 年 5 月起已廣泛可用且可省依賴；本專案不維護舊瀏覽器最低版本矩陣，但本次已決定採 pako，避免同時引入兩套 codec 路徑。

採用 pako 的原因是它能提供一致、容易測試的同步 codec，適合這個小型 payload 與舊專案的直接切換。原生 `CompressionStream` 不列入本次實作。

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

### Phase 0：固定現況基線

- 以第 11 節已確認決策建立可驗收的行為基線；新增需求必須先更新本規格。
- 建立現況 smoke test 與舊設定 fixtures；舊分享連結不納入相容 fixtures。
- 記錄目前最新季、單季選取、跨季排名、設定存讀及匯入匯出的操作結果。

### Phase 1：建立 domain 與相容層

- 建立 Season、AnimeAppearance、UserAnimeState、ListSnapshot、SavedPreset 型別與 schema。
- 建立 v2 pako codec 及 round-trip tests，不實作舊純 Base64 decoder。
- 建立舊 `MonthItem`／`allItem` 設定遷移器。

### Phase 2：重做狀態與資料存取

- 將動畫主資料和使用者狀態分離。
- 建立 repository、store、數字優先的穩定排序 selector 與名稱配對 selector。
- 移除頁面中的 axios、Base64、localStorage 和直接 props mutation。

### Phase 3：重做主要畫面

- 完成季度頁、跨季頁、頂部排名區與響應式卡片。
- 補齊 loading、empty、error、圖片失敗、鍵盤與觸控操作。
- 加入清楚的分享按鈕和還原錯誤提示。

### Phase 4：設定與檔案交換

- 以統一 schema 重做另存、覆蓋、刪除、搜尋、匯入和匯出。
- 啟用 legacy migration，驗證舊設定不遺失。

### Phase 5：資料管線與工具鏈

- 移除 YuC scraper，改由本地規則產生季度選單並只抓取 ACGNTaiwan JSON。
- 合併重複輸出、加入 schema 驗證、atomic write 和 fixtures；移除已無用途的 Cheerio、OpenCC 等依賴。
- 更新 CI/Node/Actions 與依賴；每一類升級分開提交並跑完整測試。

### Phase 6：移除舊碼

- 移除舊純 Base64 分享 codec、重複頁面邏輯、未使用元件與 debug log。
- 確認 package 中不再需要 `js-base64` 後移除依賴；pako 後的 Base64url 轉換由小型 bytes codec 或瀏覽器 API 負責。

## 9. 測試與驗收

### 9.1 單元測試

- v2 codec 對中文、日文、emoji、空清單、大清單可 round trip。
- 損壞、截斷、未知版本及解壓超限 payload 被安全拒絕。
- 數字名次、重複名次、非數字名次和未排名項目的排序結果固定。
- 名稱配對在單季與跨季 snapshot 中符合已確認限制。
- preset create/read/update/delete、deep copy 與舊格式 migration 正確。
- 季度產生器可從設定起始季度正確產生到當前季度，順序由新到舊。
- ACGNTaiwan parser 使用固定 JSON fixtures 測正常、缺欄位、無資料與請求失敗；流程不再呼叫 YuC。

### 9.2 元件測試

- 點擊、右鍵、鍵盤與觸控皆能完成選取／排名。
- 左鍵與鍵盤可完整循環五種觀看狀態，從棄番再次操作會回到未選取。
- 取消排名輸入不改狀態；非數字名次不阻擋保存，並依規定排在數字名次之後。
- prompt 輸入空白並確認會清除名次；觸控／鍵盤選單也能明確清除。
- 載入、空清單、資料錯誤與圖片錯誤狀態正確。
- 讀取或覆蓋 preset 不會因物件引用改到原 preset。

### 9.3 E2E 測試

1. 最新季度可載入、切換季度並以網址直接開啟。
2. 選取和排名後複製分享連結，在新的瀏覽器 context 可還原相同畫面。
3. 跨季分享連結開啟時只先顯示共用彙整清單，兩季預設收合且可由收件者展開。
4. 跨季清單固定比較兩季並在上方依規則排序，收合季度不影響結果。
5. 收件者修改分享內容後可產生自己的分享連結。
6. 建立設定、重新整理、讀取、覆蓋、匯出、刪除與再匯入均成功，同名 preset 可並存。
7. 在手機與桌面 viewport 無控制項重疊、文字溢出或非預期水平捲動。

### 9.4 建置基線

目前 `npm run build` 可成功完成。重構期間每個 phase 都必須維持 production build、單元測試和 E2E smoke test 通過。

## 10. 已發現的風險與接受限制

1. 無分享 hash 時仍執行 `JSON.parse('')`，目前只由 promise catch 隱藏錯誤。
2. 動畫名稱被當作狀態配對鍵。現有 28 季、1,620 筆資料中有 15 個名稱重複，可能誤套狀態或重複顯示；產品已決定本階段接受此限制，不維護 alias/canonical ID。
3. `show` 與 `order` 直接寫進來源資料，且上方清單與季度清單共享引用，資料流不可預測。
4. 排名允許任意 prompt 字串和重複名次；重構必須補上確定的穩定排序與清除規則，但不做阻擋式格式驗證。
5. 單季與跨季設定保存完全不同的資料型態，但元件 props 宣告未反映差異。
6. 新增／覆蓋設定保存現有物件引用，可能被後續操作連帶修改。
7. 跨季分享路徑保存的是「已載入季度」而非「清單真正使用的季度」。
8. `animeMenu` 被元件直接加入 `show` 並修改，是共享 import，跨頁生命週期可能殘留 UI 狀態。
9. 產生資料同時寫入 `src` 與 `public`，增加路徑和部署環境不一致的風險。
10. 匯入、分享 decode 和解壓若沒有大小及 schema 限制，可能造成瀏覽器卡頓或記憶體問題。
11. 固定四欄和卡片 `min-width: 275px` 不適合窄螢幕；右鍵排名在觸控裝置不可用。
12. 分享資料沒有版本，改格式或改名後無可靠遷移方式；新 pako 格式必須以版本前綴解決，但不回溯支援舊分享 payload。
13. 本階段不提供 URL 過長提示。pako 可大幅縮短一般清單，但無法保證任意長度網址在所有外部平台都不被截斷，此為已接受風險。

## 11. 已確認的產品決策

1. 觀看狀態擴充為未選取、想看、觀看中、看完與棄番；左鍵直接依序循環，棄番的下一個狀態回到未選取。
2. 有觀看狀態或已有名次的作品都列入上方彙整清單；不強制先選觀看狀態才能排名。
3. 名次允許重複、不要求連續，也不做阻擋式格式驗證，但畫面必須穩定排序。prompt 空白確認會清除名次，取消則保留原值；觸控／鍵盤選單提供「清除名次」。
4. 跨季只比較兩季，預設為最新兩季，並共用一份上方彙整清單。
5. 跨季同名、延期或跨季播出作品不特別判定，不維護人工 alias/canonical ID；先以名稱配對，名稱命中的項目都可能套用同一狀態並重複顯示。
6. 單季 preset 綁定原季度，動畫狀態以名稱還原；跨季 preset 綁定其比較的兩季。
7. 分享連結可由收件者繼續修改並產生自己的連結。
8. 開啟跨季分享時只先顯示上方彙整清單，兩季區塊預設收合，但收件者可自行展開／收合。
9. 舊純 Base64 JSON 分享格式直接停止支援；新格式採 pako + Base64url，不設相容期。
10. 不提供 URL 長度警告、短網址或自動改用匯出檔的流程。
11. 匯入 preset 時允許同名並存，以本機唯一 ID 區分，不自動覆蓋。
12. ACGNTaiwan 是唯一動畫資料來源；完全停止解析或讀取 YuC，季度選單改由本地年月規則產生。
13. 不維護舊瀏覽器最低版本矩陣，本次分享 codec 固定採 pako。
14. 不提供公開／私人設定；分享網址與匯出檔本身可被持有人讀取，壓縮不視為加密。
15. 自動更新維持每月 10、20 日執行。

## 12. 未決事項

目前沒有會阻擋重構開始的未決產品需求。後續若新增或修改需求，先更新第 5 節功能需求與第 11 節決策紀錄，再進入實作。
