/**
 * 動畫主資料 store（唯讀 catalog）。
 * 季度選單與各季資料按需載入並快取；同一操作階段不重複請求（FR-02.5）。
 * 主資料不儲存任何使用者狀態（status/rank 一律在 userList store）。
 */

import { reactive } from 'vue'
import type { Season } from '../domain/season'
import type { AnimeAppearance } from '../domain/anime'
import { fetchSeasonList, fetchSeasonData } from '../services/animeRepository'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface SeasonDataEntry {
  status: LoadStatus
  items: AnimeAppearance[]
  error: string
}

const state = reactive({
  seasonsStatus: 'idle' as LoadStatus,
  seasonsError: '',
  seasons: [] as Season[],
  seasonData: {} as Record<string, SeasonDataEntry>,
})

let seasonsPromise: Promise<Season[]> | null = null
const seasonPromises: Record<string, Promise<AnimeAppearance[]>> = {}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 載入季度選單（快取；失敗後可重試）。 */
function ensureSeasons(): Promise<Season[]> {
  if (!seasonsPromise) {
    state.seasonsStatus = state.seasons.length ? 'ready' : 'loading'
    state.seasonsError = ''
    seasonsPromise = fetchSeasonList()
      .then((seasons) => {
        state.seasons = seasons
        state.seasonsStatus = 'ready'
        return seasons
      })
      .catch((e) => {
        state.seasonsStatus = 'error'
        state.seasonsError = errorMessage(e)
        seasonsPromise = null
        throw e
      })
  }
  return seasonsPromise
}

/** 載入單季資料（快取；失敗後可重試）。 */
function ensureSeason(seasonId: string): Promise<AnimeAppearance[]> {
  const cached = seasonPromises[seasonId]
  if (cached) return cached
  if (!state.seasonData[seasonId]) {
    state.seasonData[seasonId] = { status: 'idle', items: [], error: '' }
  }
  const entry = state.seasonData[seasonId]
  entry.status = 'loading'
  entry.error = ''
  const promise = ensureSeasons()
    .then((seasons) => {
      const season = seasons.find((s) => s.id === seasonId)
      if (!season) throw new Error(`季度 ${seasonId} 不存在`)
      return fetchSeasonData(season)
    })
    .then((items) => {
      entry.items = items
      entry.status = 'ready'
      return items
    })
    .catch((e) => {
      entry.status = 'error'
      entry.error = errorMessage(e)
      delete seasonPromises[seasonId]
      throw e
    })
  seasonPromises[seasonId] = promise
  return promise
}

function seasonEntry(seasonId: string): SeasonDataEntry | undefined {
  return state.seasonData[seasonId]
}

function getSeason(seasonId: string): Season | undefined {
  return state.seasons.find((s) => s.id === seasonId)
}

function latestSeason(): Season | undefined {
  return state.seasons[0]
}

export function useAnimeCatalog() {
  return { state, ensureSeasons, ensureSeason, seasonEntry, getSeason, latestSeason }
}
