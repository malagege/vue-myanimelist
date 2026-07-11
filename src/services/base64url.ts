/**
 * Base64url（無 padding）bytes codec。
 * 自行實作以確保瀏覽器與 Node（單元測試）行為一致、輸出可預期。
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const REVERSE: Record<string, number> = {}
for (let i = 0; i < ALPHABET.length; i++) REVERSE[ALPHABET[i]] = i

export class Base64UrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Base64UrlError'
  }
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0
    out += ALPHABET[b0 >> 2]
    out += ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)]
    if (i + 1 < bytes.length) out += ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)]
    if (i + 2 < bytes.length) out += ALPHABET[b2 & 0x3f]
  }
  return out
}

export function base64UrlToBytes(value: string): Uint8Array {
  const remainder = value.length % 4
  if (remainder === 1) throw new Base64UrlError('Base64url 長度不合法')
  const byteLength = Math.floor((value.length * 3) / 4)
  const bytes = new Uint8Array(byteLength)
  let outIndex = 0
  let buffer = 0
  let bits = 0
  for (const ch of value) {
    const val = REVERSE[ch]
    if (val === undefined) throw new Base64UrlError(`Base64url 含有不合法字元：${ch}`)
    buffer = (buffer << 6) | val
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes[outIndex++] = (buffer >> bits) & 0xff
    }
  }
  return bytes
}
