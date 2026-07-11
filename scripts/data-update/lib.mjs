/**
 * 資料更新管線的純函式（可單元測試，不做 I/O）。
 * ACGNTaiwan 是唯一資料來源；季度選單由本地年月規則產生，不再解析外部網站。
 */

export const SEASON_MONTHS = [1, 4, 7, 10]

export function seasonIdOf(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseSeasonId(id) {
  const m = /^(\d{4})-(01|04|07|10)$/.exec(id)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]) }
}

export function seasonLabelOf(id) {
  const parsed = parseSeasonId(id)
  return `${parsed.year}年${parsed.month}月新番`
}

/** 回傳日期所屬季度（月份向下取到 1/4/7/10）。 */
export function seasonForDate(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const seasonMonth = [...SEASON_MONTHS].reverse().find((m) => m <= month)
  return { year, month: seasonMonth }
}

/**
 * 由起始季度產生到指定日期所屬季度的所有季度 id，順序由新到舊。
 * 起始季度不合法或晚於當前季度時丟出錯誤。
 */
export function generateSeasonIds(startId, untilDate) {
  const start = parseSeasonId(startId)
  if (!start) throw new Error(`起始季度格式不合法：${startId}（應為 YYYY-MM，MM 為 01/04/07/10）`)
  const until = seasonForDate(untilDate)
  const ids = []
  let { year, month } = start
  while (year < until.year || (year === until.year && month <= until.month)) {
    ids.push(seasonIdOf(year, month))
    const next = SEASON_MONTHS[(SEASON_MONTHS.indexOf(month) + 1) % SEASON_MONTHS.length]
    if (next === 1) year += 1
    month = next
  }
  if (ids.length === 0) throw new Error(`起始季度 ${startId} 晚於當前季度，無法產生選單`)
  return ids.reverse()
}

export function acgnUrlOf(seasonId) {
  const { year, month } = parseSeasonId(seasonId)
  return `https://acgntaiwan.github.io/Anime-List/anime-data/anime${year}.${String(month).padStart(2, '0')}.json`
}

const ACGN_BASE = 'https://acgntaiwan.github.io/Anime-List/'

/**
 * 將 ACGNTaiwan 原始欄位正規化為 AnimeAppearance（不含 seasonId，由前端載入時補上）。
 * 缺少名稱的資料列回傳 null（呼叫端負責記錄警告）。
 */
export function normalizeAcgnRecord(raw, index) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) return null
  let imageUrl = typeof raw.img === 'string' ? raw.img.trim() : ''
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
    imageUrl = ACGN_BASE + imageUrl.replace(/^\/+/, '')
  }
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  return {
    name,
    originalTitle: str(raw.originalName),
    imageUrl,
    description: str(raw.description),
    staff: str(raw.staff),
    officialUrl: str(raw.official),
    airDate: str(raw.date) || null,
    airTime: str(raw.time) || null,
    sourceOrder: index,
  }
}

/**
 * 正規化整季資料。回傳 { items, warnings }；來源不是陣列時丟出錯誤。
 */
export function normalizeSeasonData(raw, seasonId) {
  if (!Array.isArray(raw)) {
    throw new Error(`季度 ${seasonId} 來源資料不是陣列`)
  }
  const items = []
  const warnings = []
  raw.forEach((record, i) => {
    const normalized = normalizeAcgnRecord(record, items.length)
    if (normalized) {
      items.push(normalized)
    } else {
      warnings.push(`季度 ${seasonId} 第 ${i + 1} 筆資料缺少名稱，已略過`)
    }
  })
  return { items, warnings }
}

/** 輸出前的 schema 驗證：整季必須非空且每筆欄位型別正確。 */
export function assertSeasonOutput(items, seasonId) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`季度 ${seasonId} 正規化後沒有任何資料`)
  }
  items.forEach((item, i) => {
    if (typeof item.name !== 'string' || !item.name) {
      throw new Error(`季度 ${seasonId} 第 ${i + 1} 筆輸出缺少名稱`)
    }
    for (const key of ['originalTitle', 'imageUrl', 'description', 'staff', 'officialUrl']) {
      if (typeof item[key] !== 'string') {
        throw new Error(`季度 ${seasonId} 第 ${i + 1} 筆輸出欄位 ${key} 型別錯誤`)
      }
    }
    if (typeof item.sourceOrder !== 'number') {
      throw new Error(`季度 ${seasonId} 第 ${i + 1} 筆輸出缺少 sourceOrder`)
    }
  })
}

/** 由有資料的季度組出 seasons.json 內容（輸入已為新到舊）。 */
export function buildSeasonMenu(seasonIds) {
  return seasonIds.map((id) => {
    const { year, month } = parseSeasonId(id)
    return {
      id,
      label: seasonLabelOf(id),
      year,
      month,
      dataUrl: `data/seasons/${id}.json`,
    }
  })
}
