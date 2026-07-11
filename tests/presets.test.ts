import { describe, it, expect, beforeEach } from 'vitest'
import { deflateRaw } from 'pako'
import { convertLegacyPreset, isLegacyPresetShape } from '../src/services/legacyPresets'
import { loadPresets, persistPresets, STORAGE_KEY } from '../src/services/presetRepository'
import { safeFileName, parsePresetFileText } from '../src/services/fileTransfer'
import { cloneSnapshot } from '../src/domain/preset'
import { bytesToBase64Url } from '../src/services/base64url'
import type { ListSnapshot } from '../src/domain/snapshot'

const NOW = new Date(2026, 6, 11) // 2026-07-11

function legacyHashOf(entries: unknown): string {
  return '#' + bytesToBase64Url(new TextEncoder().encode(JSON.stringify(entries)))
}

// ---- localStorage mock（node 環境沒有 localStorage）----
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null }
  setItem(key: string, value: string) { this.map.set(key, String(value)) }
  removeItem(key: string) { this.map.delete(key) }
  clear() { this.map.clear() }
  key(i: number) { return [...this.map.keys()][i] ?? null }
  get length() { return this.map.size }
}

beforeEach(() => {
  ;(globalThis as Record<string, unknown>).localStorage = new MemoryStorage()
})

describe('legacy 轉換器', () => {
  it('判斷舊格式外形', () => {
    expect(isLegacyPresetShape({ name: 'a', settingVar: [] })).toBe(true)
    expect(isLegacyPresetShape({ name: 'a', snapshot: {} })).toBe(false)
    expect(isLegacyPresetShape(null)).toBe(false)
  })

  it('舊單季設定：show -> 想看、order -> rank、綁定目前季度', () => {
    const converted = convertLegacyPreset(
      {
        name: ' 我的設定 ',
        settingVar: [
          { name: '動畫A', show: true, order: '1' },
          { name: '動畫B', show: true },
          { name: '動畫C', order: 2 },
          { name: '動畫D' }, // 無意義 -> 濾除
        ],
      },
      NOW,
    )
    expect(converted.name).toBe('我的設定')
    expect(converted.snapshot.mode).toBe('season')
    expect(converted.snapshot.seasonIds).toEqual(['2026-07'])
    expect(converted.snapshot.entries).toEqual([
      { name: '動畫A', status: 'planned', rank: '1' },
      { name: '動畫B', status: 'planned', rank: null },
      { name: '動畫C', status: 'unselected', rank: '2' },
    ])
    expect(converted.notes.length).toBe(1)
  })

  it('舊跨季設定：解析 path 季度與 hash 內容', () => {
    const converted = convertLegacyPreset(
      {
        name: '跨季',
        settingVar: {
          path: '/all/2026年7月新番,2026年4月新番',
          hash: legacyHashOf([{ name: '動畫A', show: true, order: '3' }]),
        },
      },
      NOW,
    )
    expect(converted.snapshot.mode).toBe('cross-season')
    expect(converted.snapshot.seasonIds).toEqual(['2026-07', '2026-04'])
    expect(converted.snapshot.entries).toEqual([{ name: '動畫A', status: 'planned', rank: '3' }])
  })

  it('舊跨季設定超過兩季取前兩季、壞 hash 僅保留季度', () => {
    const converted = convertLegacyPreset(
      {
        name: 'x',
        settingVar: { path: '/all/2026年7月新番,2026年4月新番,2026年1月新番', hash: '#不是base64!!' },
      },
      NOW,
    )
    expect(converted.snapshot.seasonIds).toEqual(['2026-07', '2026-04'])
    expect(converted.snapshot.entries).toEqual([])
    expect(converted.notes.some((n) => n.includes('取前兩季'))).toBe(true)
    expect(converted.notes.some((n) => n.includes('無法解析'))).toBe(true)
  })

  it('無法辨識的 settingVar 丟出錯誤', () => {
    expect(() => convertLegacyPreset({ name: 'x', settingVar: 123 }, NOW)).toThrow()
  })
})

describe('presetRepository 遷移', () => {
  it('首次載入遷移 MonthItem 與 allItem，且不刪除舊資料', () => {
    localStorage.setItem('MonthItem', JSON.stringify([
      { name: '單季設定', settingVar: [{ name: '動畫A', show: true, order: '1' }] },
    ]))
    localStorage.setItem('allItem', JSON.stringify([
      { name: '跨季設定', settingVar: { path: '/all/2026年4月新番,2026年1月新番', hash: legacyHashOf([{ name: '動畫B', show: true }]) } },
    ]))

    const result = loadPresets()
    expect(result.presets.length).toBe(2)
    expect(result.presets.map((p) => p.name).sort()).toEqual(['單季設定', '跨季設定'])
    // 舊資料保留
    expect(localStorage.getItem('MonthItem')).not.toBeNull()
    expect(localStorage.getItem('allItem')).not.toBeNull()

    // 再次載入不重複遷移
    const again = loadPresets()
    expect(again.presets.length).toBe(2)
  })

  it('損壞的 v2 資料不會炸掉，回報備註', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json')
    const result = loadPresets()
    expect(result.presets).toEqual([])
    expect(result.notes.some((n) => n.includes('損壞'))).toBe(true)
  })

  it('未知版本進入唯讀，不覆寫原資料', () => {
    const original = JSON.stringify({ version: 99, presets: [{ future: true }] })
    localStorage.setItem(STORAGE_KEY, original)
    const result = loadPresets()
    expect(result.readOnly).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original)
  })

  it('persist 後可重新載入', () => {
    const snapshot: ListSnapshot = { version: 2, mode: 'season', seasonIds: ['2026-07'], entries: [] }
    persistPresets([
      { id: 'id-1', name: '測試', snapshot, createdAt: '2026-07-11T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z' },
    ])
    const result = loadPresets()
    expect(result.presets.length).toBe(1)
    expect(result.presets[0].name).toBe('測試')
  })
})

describe('深拷貝', () => {
  it('cloneSnapshot 與原物件無共享引用', () => {
    const snapshot: ListSnapshot = {
      version: 2,
      mode: 'season',
      seasonIds: ['2026-07'],
      entries: [{ name: 'A', status: 'planned', rank: '1' }],
    }
    const cloned = cloneSnapshot(snapshot)
    cloned.entries[0].rank = '999'
    cloned.seasonIds.push('2026-04')
    expect(snapshot.entries[0].rank).toBe('1')
    expect(snapshot.seasonIds).toEqual(['2026-07'])
  })
})

describe('fileTransfer', () => {
  it('檔名替換禁用字元、空名稱用預設值', () => {
    expect(safeFileName('我的<設定>:v1?')).toBe('我的_設定__v1_.json')
    expect(safeFileName('a/b\\c|d')).toBe('a_b_c_d.json')
    expect(safeFileName('   ')).toBe('未命名設定.json')
    expect(safeFileName('結尾點...')).toBe('結尾點.json')
  })

  it('匯入新版設定檔通過驗證', () => {
    const text = JSON.stringify({
      id: 'x',
      name: '新版設定',
      snapshot: { version: 2, mode: 'season', seasonIds: ['2026-07'], entries: [] },
      createdAt: '2026-07-11T00:00:00.000Z',
      updatedAt: '2026-07-11T00:00:00.000Z',
    })
    const { preset, notes } = parsePresetFileText(text)
    expect(preset.name).toBe('新版設定')
    expect(notes).toEqual([])
  })

  it('匯入舊版 { name, settingVar } 檔案走 legacy adapter', () => {
    const { preset, notes } = parsePresetFileText(
      JSON.stringify({ name: '舊檔', settingVar: [{ name: 'A', show: true }] }),
    )
    expect(preset.snapshot.mode).toBe('season')
    expect(preset.snapshot.entries).toEqual([{ name: 'A', status: 'planned', rank: null }])
    expect(notes.length).toBe(1)
  })

  it('無效檔案顯示可理解原因且不寫入資料', () => {
    expect(() => parsePresetFileText('not json')).toThrow('不是有效的 JSON')
    expect(() => parsePresetFileText('{"foo":1}')).toThrow('驗證失敗')
    expect(() =>
      parsePresetFileText(JSON.stringify({ id: 'x', name: 'n', snapshot: { version: 99 } })),
    ).toThrow('驗證失敗')
    // zip bomb 類型內容與匯入無關，但確認二進位字串也被拒絕
    expect(() => parsePresetFileText(String(deflateRaw(new Uint8Array(10))))).toThrow()
  })
})
