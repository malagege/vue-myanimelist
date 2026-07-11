/**
 * 動畫資料存取邊界：HTTP 細節只存在這裡，回傳前一律通過 schema 驗證。
 */

import type { Season } from '../domain/season'
import type { AnimeAppearance } from '../domain/anime'
import { validateSeasonList, validateSeasonData } from '../domain/schemas'

const BASE: string = (import.meta as unknown as { env: Record<string, string> }).env.BASE_URL || '/'

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`載入失敗（HTTP ${res.status}）`)
  }
  return res.json()
}

export async function fetchSeasonList(): Promise<Season[]> {
  return validateSeasonList(await fetchJson(`${BASE}data/seasons.json`))
}

export async function fetchSeasonData(season: Season): Promise<AnimeAppearance[]> {
  return validateSeasonData(await fetchJson(`${BASE}${season.dataUrl}`), season.id)
}
