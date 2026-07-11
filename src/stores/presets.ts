/**
 * 已儲存設定 store：所有 CRUD 都經過深拷貝與 schema 驗證，
 * localStorage 細節在 presetRepository。
 */

import { reactive } from 'vue'
import type { ListSnapshot } from '../domain/snapshot'
import type { SavedPreset } from '../domain/preset'
import { createPresetId, cloneSnapshot } from '../domain/preset'
import { loadPresets, persistPresets, PresetStorageError } from '../services/presetRepository'

const state = reactive({
  presets: [] as SavedPreset[],
  initialized: false,
  readOnly: false,
  storageError: '',
  notes: [] as string[],
})

function init() {
  if (state.initialized) return
  state.initialized = true
  try {
    const result = loadPresets()
    state.presets = result.presets
    state.readOnly = result.readOnly
    state.notes = result.notes
  } catch (e) {
    state.storageError = e instanceof PresetStorageError ? e.message : String(e)
    state.readOnly = true
  }
}

function persist() {
  if (state.readOnly) {
    throw new PresetStorageError('設定目前為唯讀狀態，無法寫入')
  }
  try {
    persistPresets(state.presets)
    state.storageError = ''
  } catch (e) {
    state.storageError = e instanceof Error ? e.message : String(e)
    throw e
  }
}

/** 另存新設定：名稱去空白且不可為空；snapshot 深拷貝。 */
function saveAs(name: string, snapshot: ListSnapshot): SavedPreset {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('設定名稱不可為空')
  const timestamp = new Date().toISOString()
  const preset: SavedPreset = {
    id: createPresetId(),
    name: trimmed,
    snapshot: cloneSnapshot(snapshot),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  state.presets.unshift(preset)
  persist()
  return preset
}

function rename(id: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('設定名稱不可為空')
  const preset = state.presets.find((p) => p.id === id)
  if (!preset) throw new Error('找不到要改名的設定')
  preset.name = trimmed
  preset.updatedAt = new Date().toISOString()
  persist()
}

function overwrite(id: string, snapshot: ListSnapshot) {
  const preset = state.presets.find((p) => p.id === id)
  if (!preset) throw new Error('找不到要覆蓋的設定')
  preset.snapshot = cloneSnapshot(snapshot)
  preset.updatedAt = new Date().toISOString()
  persist()
}

function remove(id: string) {
  const index = state.presets.findIndex((p) => p.id === id)
  if (index < 0) return
  state.presets.splice(index, 1)
  persist()
}

/** 匯入：一律建立新的本機 id，允許同名並存（FR-07.5）。 */
function importPreset(preset: SavedPreset): SavedPreset {
  const timestamp = new Date().toISOString()
  const imported: SavedPreset = {
    id: createPresetId(),
    name: preset.name,
    snapshot: cloneSnapshot(preset.snapshot),
    createdAt: preset.createdAt || timestamp,
    updatedAt: timestamp,
  }
  state.presets.unshift(imported)
  persist()
  return imported
}

export function usePresets() {
  init()
  return { state, saveAs, rename, overwrite, remove, importPreset }
}
