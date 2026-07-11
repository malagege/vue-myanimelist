/**
 * v2 分享 codec（FR-08 / FR-09）：
 *   encode: 版本化 JSON -> UTF-8 -> DEFLATE raw -> Base64url(無 padding) -> "v2." + payload
 *   decode: 版本前綴 -> Base64url -> INFLATE raw（含大小上限） -> JSON -> schema 驗證
 * 純函式邊界：不得依賴 Vue、router、store 或 DOM；相同 snapshot 的輸出固定。
 * 舊「純 Base64 JSON」格式已停止支援（產品決策 9），一律以未知版本拒絕。
 */

import { deflateRaw, Inflate } from 'pako'
import type { ListSnapshot } from '../domain/snapshot'
import { validateSnapshot, SchemaError } from '../domain/schemas'
import { bytesToBase64Url, base64UrlToBytes, Base64UrlError } from './base64url'

export const SHARE_VERSION_PREFIX = 'v2.'

/** 分享字串長度上限（防止惡意超長輸入）。 */
export const MAX_ENCODED_LENGTH = 100_000
/** 解壓後 bytes 上限（防止 zip bomb 消耗記憶體）。 */
export const MAX_DECODED_BYTES = 1_000_000

export type ShareDecodeErrorCode =
  | 'unsupported-version'
  | 'too-large'
  | 'invalid-base64'
  | 'inflate-failed'
  | 'invalid-json'
  | 'invalid-snapshot'

export class ShareDecodeError extends Error {
  code: ShareDecodeErrorCode
  constructor(code: ShareDecodeErrorCode, message: string) {
    super(message)
    this.name = 'ShareDecodeError'
    this.code = code
  }
}

/** 以固定欄位順序序列化，確保相同 snapshot 得到相同輸出。 */
function canonicalJson(snapshot: ListSnapshot): string {
  return JSON.stringify({
    version: snapshot.version,
    mode: snapshot.mode,
    seasonIds: snapshot.seasonIds,
    entries: snapshot.entries.map((entry) => ({
      name: entry.name,
      status: entry.status,
      rank: entry.rank,
    })),
  })
}

export function encodeShare(snapshot: ListSnapshot): string {
  const normalized = validateSnapshot(snapshot)
  const json = canonicalJson(normalized)
  const bytes = new TextEncoder().encode(json)
  const compressed = deflateRaw(bytes, { level: 9 })
  return SHARE_VERSION_PREFIX + bytesToBase64Url(compressed)
}

function inflateRawLimited(bytes: Uint8Array, maxBytes: number): Uint8Array {
  const inflator = new Inflate({ raw: true })
  const chunks: Uint8Array[] = []
  let total = 0
  let overflow = false
  inflator.onData = (chunk: Uint8Array) => {
    total += chunk.length
    if (total > maxBytes) {
      overflow = true
      return
    }
    chunks.push(chunk)
  }
  // onEnd 覆寫為 no-op，避免預設實作把 chunks 再串接一次
  inflator.onEnd = function (status: number) {
    this.err = this.err || status
  }
  inflator.push(bytes, true)
  if (overflow) {
    throw new ShareDecodeError('too-large', '分享內容解壓後過大，已拒絕載入')
  }
  if (inflator.err) {
    throw new ShareDecodeError('inflate-failed', '分享內容解壓失敗，連結可能已損壞')
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

export function decodeShare(value: string): ListSnapshot {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ShareDecodeError('invalid-base64', '分享內容是空的')
  }
  if (value.length > MAX_ENCODED_LENGTH) {
    throw new ShareDecodeError('too-large', '分享連結過長，已拒絕載入')
  }
  if (!value.startsWith(SHARE_VERSION_PREFIX)) {
    throw new ShareDecodeError('unsupported-version', '不支援的分享連結版本（可能是舊版連結）')
  }
  const payload = value.slice(SHARE_VERSION_PREFIX.length)
  let compressed: Uint8Array
  try {
    compressed = base64UrlToBytes(payload)
  } catch (e) {
    if (e instanceof Base64UrlError) {
      throw new ShareDecodeError('invalid-base64', '分享連結內容不完整或已損壞')
    }
    throw e
  }
  const bytes = inflateRawLimited(compressed, MAX_DECODED_BYTES)
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new ShareDecodeError('invalid-json', '分享內容不是有效的資料格式')
  }
  try {
    return validateSnapshot(parsed)
  } catch (e) {
    if (e instanceof SchemaError) {
      throw new ShareDecodeError('invalid-snapshot', `分享內容驗證失敗：${e.message}`)
    }
    throw e
  }
}
