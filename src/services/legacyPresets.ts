/**
 * 舊設定格式轉換器（FR-06.8、FR-07.6）。
 * 舊格式：
 *   - 單季（localStorage.MonthItem）：{ name, settingVar: [{ name, show, order }] }
 *   - 跨季（localStorage.allItem）  ：{ name, settingVar: { path: '/all/2026年7月新番,...', hash: '#<base64url>' } }
 * 轉換失敗的項目回報原因，原始資料保留在舊 key 不刪除。
 */

import type { ListSnapshot, UserAnimeState } from '../domain/snapshot'
import { isMeaningfulState } from '../domain/snapshot'
import { legacyLabelToSeasonId, currentSeasonId, previousSeasonId } from '../domain/season'
import { base64UrlToBytes } from './base64url'

export interface LegacyConversion {
  name: string
  snapshot: ListSnapshot
  notes: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 舊 { name, show, order } -> UserAnimeState；show=true 對應「想看」。 */
function convertLegacyEntry(raw: unknown): UserAnimeState | null {
  if (!isRecord(raw) || typeof raw.name !== 'string' || !raw.name.trim()) return null
  let rank: string | null = null
  if (raw.order !== null && raw.order !== undefined && String(raw.order).trim() !== '') {
    rank = String(raw.order).trim()
  }
  const state: UserAnimeState = {
    name: raw.name.trim(),
    status: raw.show === true ? 'planned' : 'unselected',
    rank,
  }
  return isMeaningfulState(state) ? state : null
}

function convertLegacyEntries(raw: unknown): UserAnimeState[] {
  if (!Array.isArray(raw)) return []
  return raw.map(convertLegacyEntry).filter((entry): entry is UserAnimeState => entry !== null)
}

/** 判斷是否為舊匯出檔／舊儲存格式 { name, settingVar }。 */
export function isLegacyPresetShape(value: unknown): value is { name: string; settingVar: unknown } {
  return isRecord(value) && typeof value.name === 'string' && 'settingVar' in value && !('snapshot' in value)
}

/**
 * 轉換單一舊設定。settingVar 為陣列＝單季；為 { path, hash } 物件＝跨季。
 * 舊單季設定沒有記錄季度，依產品規則綁定「轉換當下的最新季度」並在備註說明。
 */
export function convertLegacyPreset(raw: { name: string; settingVar: unknown }, now: Date = new Date()): LegacyConversion {
  const notes: string[] = []
  const name = raw.name.trim() || '未命名舊設定'

  if (Array.isArray(raw.settingVar)) {
    const seasonId = currentSeasonId(now)
    notes.push(`舊單季設定「${name}」未記錄季度，已綁定目前季度 ${seasonId}`)
    return {
      name,
      snapshot: {
        version: 2,
        mode: 'season',
        seasonIds: [seasonId],
        entries: convertLegacyEntries(raw.settingVar),
      },
      notes,
    }
  }

  if (isRecord(raw.settingVar) && typeof raw.settingVar.path === 'string') {
    const labels = raw.settingVar.path.replace(/^\/all\/?/, '').split(',').filter(Boolean)
    const seasonIds = labels
      .map((label) => legacyLabelToSeasonId(decodeURIComponent(label)))
      .filter((id): id is string => id !== null)
    let pair: string[]
    if (seasonIds.length >= 2) {
      pair = seasonIds.slice(0, 2)
      if (seasonIds.length > 2) {
        notes.push(`舊跨季設定「${name}」包含 ${seasonIds.length} 季，新版固定比較兩季，已取前兩季`)
      }
    } else if (seasonIds.length === 1) {
      pair = [seasonIds[0], previousSeasonId(seasonIds[0]) as string]
      notes.push(`舊跨季設定「${name}」只有一季，已補上前一季 ${pair[1]}`)
    } else {
      const current = currentSeasonId(now)
      pair = [current, previousSeasonId(current) as string]
      notes.push(`舊跨季設定「${name}」無法解析季度，已改用最新兩季`)
    }

    let entries: UserAnimeState[] = []
    const hash = typeof raw.settingVar.hash === 'string' ? raw.settingVar.hash.replace(/^#/, '') : ''
    if (hash) {
      try {
        const json = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(hash))
        entries = convertLegacyEntries(JSON.parse(json))
      } catch {
        notes.push(`舊跨季設定「${name}」的選取資料無法解析，僅保留季度`)
      }
    }
    return {
      name,
      snapshot: { version: 2, mode: 'cross-season', seasonIds: pair, entries },
      notes,
    }
  }

  throw new Error(`舊設定「${name}」的內容格式無法辨識`)
}
