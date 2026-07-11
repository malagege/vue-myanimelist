/**
 * 設定檔匯入匯出（FR-07）。
 * 匯出：UTF-8 JSON、SavedPreset schema、安全檔名。
 * 匯入：大小上限 + schema 驗證；舊 { name, settingVar } 格式走 legacy adapter。
 */

import type { SavedPreset } from '../domain/preset'
import { createPresetId } from '../domain/preset'
import { validatePreset, SchemaError } from '../domain/schemas'
import { isLegacyPresetShape, convertLegacyPreset } from './legacyPresets'

export const MAX_IMPORT_BYTES = 1_000_000

/** Windows/macOS 禁用字元與控制字元替換為底線；空名稱使用安全預設值（FR-07.2）。 */
export function safeFileName(name: string): string {
  const forbidden = /[\\/:*?"<>|]/g
  const controlChars = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + ']', 'g')
  const cleaned = name.replace(forbidden, '_').replace(controlChars, '_').replace(/[. ]+$/, '').trim()
  return (cleaned || '未命名設定') + '.json'
}

export function exportPresetFile(preset: SavedPreset) {
  const json = JSON.stringify(preset, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.style.display = 'none'
  anchor.href = url
  anchor.download = safeFileName(preset.name)
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export interface ImportedPreset {
  preset: SavedPreset
  notes: string[]
}

/** 解析匯入內容（純函式，方便測試）。無效內容一律丟出可理解的錯誤。 */
export function parsePresetFileText(text: string): ImportedPreset {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('檔案不是有效的 JSON')
  }

  if (isLegacyPresetShape(raw)) {
    const converted = convertLegacyPreset(raw)
    const timestamp = new Date().toISOString()
    return {
      preset: {
        id: createPresetId(),
        name: converted.name,
        snapshot: converted.snapshot,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      notes: converted.notes,
    }
  }

  try {
    return { preset: validatePreset(raw), notes: [] }
  } catch (e) {
    if (e instanceof SchemaError) {
      throw new Error(`設定檔驗證失敗：${e.message}`)
    }
    throw e
  }
}

export async function readPresetFile(file: File): Promise<ImportedPreset> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(`檔案過大（上限 ${Math.round(MAX_IMPORT_BYTES / 1024)} KB）`)
  }
  const text = await file.text()
  return parsePresetFileText(text)
}
