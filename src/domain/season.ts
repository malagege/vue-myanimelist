/**
 * Season（季度）domain 模型與工具。
 * 季度 id 格式固定為 `YYYY-MM`，MM 只允許 01/04/07/10。
 */

export type SeasonMonth = 1 | 4 | 7 | 10

export interface Season {
  id: string
  label: string
  year: number
  month: SeasonMonth
  dataUrl: string
}

export const SEASON_MONTHS: SeasonMonth[] = [1, 4, 7, 10]

const SEASON_ID_PATTERN = /^(\d{4})-(01|04|07|10)$/

export function isSeasonId(value: unknown): value is string {
  return typeof value === 'string' && SEASON_ID_PATTERN.test(value)
}

export function parseSeasonId(id: string): { year: number; month: SeasonMonth } | null {
  const m = SEASON_ID_PATTERN.exec(id)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]) as SeasonMonth }
}

export function seasonId(year: number, month: SeasonMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function seasonLabel(id: string): string {
  const parsed = parseSeasonId(id)
  if (!parsed) return id
  return `${parsed.year}年${parsed.month}月新番`
}

/** 舊路由 `/202607` -> `2026-07`；非法輸入回傳 null。 */
export function legacyPathToSeasonId(path: string): string | null {
  const m = /^(\d{4})(01|04|07|10)$/.exec(path)
  if (!m) return null
  return `${m[1]}-${m[2]}`
}

/** 舊季度顯示名稱 `2026年7月新番` -> `2026-07`；非法輸入回傳 null。 */
export function legacyLabelToSeasonId(label: string): string | null {
  const m = /^(\d{4})年(1|4|7|10)月新番$/.exec(label)
  if (!m) return null
  return seasonId(Number(m[1]), Number(m[2]) as SeasonMonth)
}
