/**
 * 設定儲存邊界：localStorage 存取只存在這裡（FR-06.6）。
 * key 含 schema 版本（FR-06.7）；舊 MonthItem/allItem 會遷移但不刪除（FR-06.8）。
 */

import type { SavedPreset } from '../domain/preset'
import { createPresetId } from '../domain/preset'
import { validatePreset, SchemaError } from '../domain/schemas'
import { isLegacyPresetShape, convertLegacyPreset } from './legacyPresets'

export const STORAGE_KEY = 'anime-list:presets:v2'
const LEGACY_MONTH_KEY = 'MonthItem'
const LEGACY_ALL_KEY = 'allItem'
const STORE_VERSION = 2

export class PresetStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PresetStorageError'
  }
}

export interface PresetLoadResult {
  presets: SavedPreset[]
  /** true 時不可寫入（例如偵測到未知版本，避免破壞資料，FR-06.4） */
  readOnly: boolean
  notes: string[]
}

interface StorePayload {
  version: number
  migratedLegacy: boolean
  presets: SavedPreset[]
}

function getStorage(): Storage {
  try {
    const storage = globalThis.localStorage
    // 部分瀏覽器（隱私模式）存取 localStorage 會直接丟例外
    storage.getItem(STORAGE_KEY)
    return storage
  } catch {
    throw new PresetStorageError('瀏覽器不允許使用本機儲存，設定功能無法使用')
  }
}

function parseStore(rawText: string, notes: string[]): { payload: StorePayload; readOnly: boolean } {
  let raw: unknown
  try {
    raw = JSON.parse(rawText)
  } catch {
    notes.push('本機設定資料已損壞，已重新開始（舊資料無法解析）')
    return { payload: { version: STORE_VERSION, migratedLegacy: false, presets: [] }, readOnly: false }
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    notes.push('本機設定資料格式錯誤，已重新開始')
    return { payload: { version: STORE_VERSION, migratedLegacy: false, presets: [] }, readOnly: false }
  }
  const record = raw as Record<string, unknown>
  if (record.version !== STORE_VERSION) {
    // 未知（可能更新）版本：唯讀，不可覆寫破壞
    notes.push(`本機設定資料版本（${String(record.version)}）比目前程式新，僅提供唯讀存取`)
    return {
      payload: { version: STORE_VERSION, migratedLegacy: true, presets: [] },
      readOnly: true,
    }
  }
  const presets: SavedPreset[] = []
  if (Array.isArray(record.presets)) {
    record.presets.forEach((item, i) => {
      try {
        presets.push(validatePreset(item))
      } catch (e) {
        const reason = e instanceof SchemaError ? e.message : String(e)
        notes.push(`第 ${i + 1} 筆已儲存設定驗證失敗，已略過：${reason}`)
      }
    })
  }
  return {
    payload: { version: STORE_VERSION, migratedLegacy: record.migratedLegacy === true, presets },
    readOnly: false,
  }
}

/** 遷移舊 MonthItem／allItem；只執行一次，且不刪除舊資料。 */
function migrateLegacy(storage: Storage, notes: string[]): SavedPreset[] {
  const migrated: SavedPreset[] = []
  const now = new Date()
  for (const [key, kind] of [
    [LEGACY_MONTH_KEY, '單季'],
    [LEGACY_ALL_KEY, '跨季'],
  ] as const) {
    const rawText = storage.getItem(key)
    if (!rawText) continue
    let raw: unknown
    try {
      raw = JSON.parse(rawText)
    } catch {
      notes.push(`舊${kind}設定（${key}）內容損壞，無法遷移；原始資料仍保留`)
      continue
    }
    if (!Array.isArray(raw)) {
      notes.push(`舊${kind}設定（${key}）格式非清單，無法遷移；原始資料仍保留`)
      continue
    }
    raw.forEach((item, i) => {
      try {
        if (!isLegacyPresetShape(item)) throw new Error('缺少 name 或 settingVar')
        const converted = convertLegacyPreset(item, now)
        notes.push(...converted.notes)
        const timestamp = now.toISOString()
        migrated.push({
          id: createPresetId(),
          name: converted.name,
          snapshot: converted.snapshot,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      } catch (e) {
        notes.push(
          `舊${kind}設定第 ${i + 1} 筆無法遷移：${e instanceof Error ? e.message : String(e)}；原始資料仍保留`,
        )
      }
    })
  }
  return migrated
}

export function loadPresets(): PresetLoadResult {
  const storage = getStorage()
  const notes: string[] = []
  const rawText = storage.getItem(STORAGE_KEY)
  const { payload, readOnly } = rawText
    ? parseStore(rawText, notes)
    : { payload: { version: STORE_VERSION, migratedLegacy: false, presets: [] }, readOnly: false }

  if (!readOnly && !payload.migratedLegacy) {
    const migrated = migrateLegacy(storage, notes)
    if (migrated.length > 0) {
      notes.push(`已將 ${migrated.length} 筆舊設定遷移為新格式（舊資料保留原處）`)
    }
    payload.presets = [...migrated, ...payload.presets]
    payload.migratedLegacy = true
    persistPresets(payload.presets, { migratedLegacy: true })
  }

  return { presets: payload.presets, readOnly, notes }
}

export function persistPresets(presets: SavedPreset[], options: { migratedLegacy?: boolean } = {}) {
  const storage = getStorage()
  const payload: StorePayload = {
    version: STORE_VERSION,
    migratedLegacy: options.migratedLegacy ?? true,
    presets,
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    throw new PresetStorageError('設定儲存失敗（可能是儲存空間不足），請刪除部分設定後再試')
  }
}
