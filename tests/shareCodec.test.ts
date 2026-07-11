import { describe, it, expect } from 'vitest'
import { deflateRaw } from 'pako'
import {
  encodeShare,
  decodeShare,
  ShareDecodeError,
  SHARE_VERSION_PREFIX,
  MAX_ENCODED_LENGTH,
} from '../src/services/shareCodec'
import { bytesToBase64Url, base64UrlToBytes } from '../src/services/base64url'
import type { ListSnapshot } from '../src/domain/snapshot'

function makeSnapshot(entries: ListSnapshot['entries']): ListSnapshot {
  return { version: 2, mode: 'season', seasonIds: ['2026-07'], entries }
}

describe('base64url', () => {
  it('round trip 任意 bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255, 63, 64])
    expect(base64UrlToBytes(bytesToBase64Url(bytes))).toEqual(bytes)
  })

  it('拒絕不合法字元', () => {
    expect(() => base64UrlToBytes('ab+/')).toThrow()
    expect(() => base64UrlToBytes('ab=')).toThrow()
  })
})

describe('shareCodec round trip', () => {
  it('中文、日文與 emoji 可以還原', () => {
    const snapshot = makeSnapshot([
      { name: '葬送的芙莉蓮', status: 'completed', rank: '1' },
      { name: 'ふつつかな悪女ではございますが', status: 'watching', rank: null },
      { name: '🌸櫻花莊✨', status: 'planned', rank: '2' },
    ])
    expect(decodeShare(encodeShare(snapshot))).toEqual(snapshot)
  })

  it('空清單可以還原', () => {
    const snapshot = makeSnapshot([])
    expect(decodeShare(encodeShare(snapshot))).toEqual(snapshot)
  })

  it('跨季大清單（200 筆）可以還原', () => {
    const entries = Array.from({ length: 200 }, (_, i) => ({
      name: `第${i}部超長動畫名稱測試用資料字串`,
      status: (['planned', 'watching', 'completed', 'dropped'] as const)[i % 4],
      rank: i % 3 === 0 ? String(i) : null,
    }))
    const snapshot: ListSnapshot = {
      version: 2,
      mode: 'cross-season',
      seasonIds: ['2026-04', '2026-07'],
      entries,
    }
    expect(decodeShare(encodeShare(snapshot))).toEqual(snapshot)
  })

  it('相同 snapshot 的輸出固定', () => {
    const snapshot = makeSnapshot([{ name: 'A', status: 'planned', rank: null }])
    expect(encodeShare(snapshot)).toBe(encodeShare(snapshot))
  })

  it('輸出帶 v2. 前綴且不含 URL 不安全字元', () => {
    const encoded = encodeShare(makeSnapshot([{ name: '測試', status: 'planned', rank: null }]))
    expect(encoded.startsWith(SHARE_VERSION_PREFIX)).toBe(true)
    expect(encoded.slice(3)).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('shareCodec 錯誤處理', () => {
  const errorCode = (value: string) => {
    try {
      decodeShare(value)
      return null
    } catch (e) {
      return e instanceof ShareDecodeError ? e.code : 'other'
    }
  }

  it('拒絕舊純 Base64 分享格式（無版本前綴）', () => {
    const legacy = bytesToBase64Url(new TextEncoder().encode(JSON.stringify([{ name: 'A', show: true }])))
    expect(errorCode(legacy)).toBe('unsupported-version')
  })

  it('拒絕未知版本前綴', () => {
    expect(errorCode('v1.abcd')).toBe('unsupported-version')
    expect(errorCode('v3.abcd')).toBe('unsupported-version')
  })

  it('拒絕空字串與超長輸入', () => {
    expect(errorCode('')).toBe('invalid-base64')
    expect(errorCode('v2.' + 'A'.repeat(MAX_ENCODED_LENGTH + 10))).toBe('too-large')
  })

  it('拒絕不合法 Base64url', () => {
    expect(errorCode('v2.ab=cd!')).toBe('invalid-base64')
  })

  it('拒絕截斷或損壞的 payload', () => {
    const encoded = encodeShare(makeSnapshot([{ name: '測試動畫', status: 'planned', rank: null }]))
    expect(errorCode(encoded.slice(0, 10))).toBe('inflate-failed')
    expect(errorCode('v2.AAAAAAAAAAAAAAAA')).toBe('inflate-failed')
  })

  it('拒絕解壓後不是 JSON 的內容', () => {
    const bogus = SHARE_VERSION_PREFIX + bytesToBase64Url(deflateRaw(new TextEncoder().encode('not json at all')))
    expect(errorCode(bogus)).toBe('invalid-json')
  })

  it('拒絕 JSON 內版本未知或 schema 錯誤', () => {
    const wrap = (obj: unknown) =>
      SHARE_VERSION_PREFIX + bytesToBase64Url(deflateRaw(new TextEncoder().encode(JSON.stringify(obj))))
    expect(errorCode(wrap({ version: 99, mode: 'season', seasonIds: ['2026-07'], entries: [] }))).toBe(
      'invalid-snapshot',
    )
    expect(errorCode(wrap({ version: 2, mode: 'season', seasonIds: ['2026-07'] }))).toBe('invalid-snapshot')
    expect(errorCode(wrap([1, 2, 3]))).toBe('invalid-snapshot')
  })

  it('拒絕解壓後超過大小上限的 payload（zip bomb）', () => {
    const huge = new Uint8Array(2_000_000) // 全零，高壓縮比
    const bomb = SHARE_VERSION_PREFIX + bytesToBase64Url(deflateRaw(huge))
    expect(errorCode(bomb)).toBe('too-large')
  })
})
