import { describe, it, expect } from 'vitest'
import { decodeShare } from '../src/services/shareCodec'
// pako 2.2.0（level 9, deflateRaw）產生並固定的 payload；
// 升級 pako 後必須仍可解碼，確保已流通的舊分享連結不失效。
import fixture from './fixtures/pako2-share.json'

describe('pako 版本相容性', () => {
  it('pako 2 產生的分享連結在目前版本仍可解碼', () => {
    const snapshot = decodeShare(fixture.payload)
    expect(snapshot).toEqual(fixture.expected)
  })
})
