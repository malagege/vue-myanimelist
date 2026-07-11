import type { ListSnapshot } from './snapshot'

/**
 * SavedPreset（已儲存設定）：以本機唯一 id 區分，允許同名並存。
 */
export interface SavedPreset {
  id: string
  name: string
  snapshot: ListSnapshot
  createdAt: string
  updatedAt: string
}

export function createPresetId(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 深拷貝：另存／覆蓋／讀取設定都不可與現用清單共享物件引用。 */
export function cloneSnapshot(snapshot: ListSnapshot): ListSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as ListSnapshot
}
