/**
 * 執行期 schema 驗證：分享 payload、設定檔與季度資料都必須先通過這裡才可使用。
 * 驗證失敗一律丟出 SchemaError，訊息可直接顯示給使用者。
 */

import type { AnimeAppearance } from './anime'
import type { Season, SeasonMonth } from './season'
import { isSeasonId } from './season'
import type { ListSnapshot, SnapshotMode, UserAnimeState, WatchStatus } from './snapshot'
import { SNAPSHOT_VERSION, WATCH_STATUSES } from './snapshot'
import type { SavedPreset } from './preset'

export class SchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SchemaError'
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asOptionalString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function validateUserAnimeState(value: unknown, where: string): UserAnimeState {
  if (!isPlainObject(value)) throw new SchemaError(`${where}：項目不是物件`)
  const name = asTrimmedString(value.name)
  if (!name) throw new SchemaError(`${where}：項目缺少動畫名稱`)
  const status = value.status
  if (!WATCH_STATUSES.includes(status as WatchStatus)) {
    throw new SchemaError(`${where}：「${name}」的觀看狀態不合法`)
  }
  let rank: string | null = null
  if (value.rank !== null && value.rank !== undefined && value.rank !== '') {
    if (typeof value.rank !== 'string' && typeof value.rank !== 'number') {
      throw new SchemaError(`${where}：「${name}」的名次格式不合法`)
    }
    rank = String(value.rank)
  }
  return { name, status: status as WatchStatus, rank }
}

/**
 * 驗證並遷移為目前版本的 ListSnapshot。
 * 目前僅有 version 2；未知版本必須拒絕，不可默默丟棄資料。
 */
export function validateSnapshot(value: unknown): ListSnapshot {
  if (!isPlainObject(value)) throw new SchemaError('快照內容不是物件')
  if (typeof value.version !== 'number') throw new SchemaError('快照缺少版本欄位')
  if (value.version !== SNAPSHOT_VERSION) {
    throw new SchemaError(`不支援的快照版本：${value.version}`)
  }
  const mode = value.mode
  if (mode !== 'season' && mode !== 'cross-season') {
    throw new SchemaError('快照模式必須是 season 或 cross-season')
  }
  if (!Array.isArray(value.seasonIds) || value.seasonIds.length === 0) {
    throw new SchemaError('快照缺少季度資訊')
  }
  const seasonIds = value.seasonIds.map((id) => {
    if (!isSeasonId(id)) throw new SchemaError(`快照包含不合法的季度：${String(id)}`)
    return id
  })
  if (mode === 'season' && seasonIds.length !== 1) {
    throw new SchemaError('單季快照必須剛好包含一個季度')
  }
  if (mode === 'cross-season' && seasonIds.length > 64) {
    throw new SchemaError('跨季快照包含的季度數量過多')
  }
  if (!Array.isArray(value.entries)) throw new SchemaError('快照缺少清單項目')
  const entries = value.entries.map((entry, i) => validateUserAnimeState(entry, `第 ${i + 1} 筆`))
  return { version: SNAPSHOT_VERSION, mode: mode as SnapshotMode, seasonIds, entries }
}

export function validatePreset(value: unknown): SavedPreset {
  if (!isPlainObject(value)) throw new SchemaError('設定內容不是物件')
  const id = asTrimmedString(value.id)
  if (!id) throw new SchemaError('設定缺少 id')
  const name = asTrimmedString(value.name)
  if (!name) throw new SchemaError('設定名稱不可為空')
  const snapshot = validateSnapshot(value.snapshot)
  const createdAt = asTrimmedString(value.createdAt) || new Date(0).toISOString()
  const updatedAt = asTrimmedString(value.updatedAt) || createdAt
  return { id, name, snapshot, createdAt, updatedAt }
}

export function validateSeason(value: unknown): Season {
  if (!isPlainObject(value)) throw new SchemaError('季度選單項目不是物件')
  const id = value.id
  if (!isSeasonId(id)) throw new SchemaError(`季度 id 不合法：${String(id)}`)
  const label = asTrimmedString(value.label)
  const dataUrl = asTrimmedString(value.dataUrl)
  if (!label || !dataUrl) throw new SchemaError(`季度 ${id} 缺少 label 或 dataUrl`)
  const year = Number(value.year)
  const month = Number(value.month)
  if (![1, 4, 7, 10].includes(month) || !Number.isInteger(year)) {
    throw new SchemaError(`季度 ${id} 的年月欄位不合法`)
  }
  return { id, label, year, month: month as SeasonMonth, dataUrl }
}

export function validateSeasonList(value: unknown): Season[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new SchemaError('季度選單是空的或格式錯誤')
  }
  return value.map(validateSeason)
}

export function validateAnimeAppearance(value: unknown, seasonId: string, index: number): AnimeAppearance {
  if (!isPlainObject(value)) throw new SchemaError(`季度 ${seasonId} 第 ${index + 1} 筆資料不是物件`)
  const name = asTrimmedString(value.name)
  if (!name) throw new SchemaError(`季度 ${seasonId} 第 ${index + 1} 筆資料缺少名稱`)
  return {
    seasonId,
    name,
    originalTitle: asOptionalString(value.originalTitle),
    imageUrl: asOptionalString(value.imageUrl),
    description: asOptionalString(value.description),
    staff: asOptionalString(value.staff),
    officialUrl: asOptionalString(value.officialUrl),
    airDate: typeof value.airDate === 'string' ? value.airDate : null,
    airTime: typeof value.airTime === 'string' ? value.airTime : null,
    sourceOrder: typeof value.sourceOrder === 'number' ? value.sourceOrder : index,
  }
}

export function validateSeasonData(value: unknown, seasonId: string): AnimeAppearance[] {
  if (!Array.isArray(value)) throw new SchemaError(`季度 ${seasonId} 的資料不是陣列`)
  return value.map((item, i) => validateAnimeAppearance(item, seasonId, i))
}
