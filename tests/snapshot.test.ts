import { describe, it, expect } from 'vitest'
import { createSnapshot, nextStatus, isMeaningfulState } from '../src/domain/snapshot'
import { validateSnapshot, SchemaError } from '../src/domain/schemas'

describe('nextStatus', () => {
  it('依序循環五種狀態並回到未選取', () => {
    expect(nextStatus('unselected')).toBe('planned')
    expect(nextStatus('planned')).toBe('watching')
    expect(nextStatus('watching')).toBe('completed')
    expect(nextStatus('completed')).toBe('dropped')
    expect(nextStatus('dropped')).toBe('unselected')
  })
})

describe('createSnapshot', () => {
  it('只保留有觀看狀態或名次的項目', () => {
    const snapshot = createSnapshot('season', ['2026-07'], [
      { name: 'A', status: 'planned', rank: null },
      { name: 'B', status: 'unselected', rank: null },
      { name: 'C', status: 'unselected', rank: '3' },
    ])
    expect(snapshot.entries.map((e) => e.name)).toEqual(['A', 'C'])
    expect(snapshot.version).toBe(2)
  })

  it('未選狀態但已有名次視為有意義', () => {
    expect(isMeaningfulState({ name: 'x', status: 'unselected', rank: '1' })).toBe(true)
    expect(isMeaningfulState({ name: 'x', status: 'unselected', rank: null })).toBe(false)
  })
})

describe('validateSnapshot', () => {
  const valid = {
    version: 2,
    mode: 'season',
    seasonIds: ['2026-07'],
    entries: [{ name: '動畫A', status: 'watching', rank: '1' }],
  }

  it('接受合法快照', () => {
    const result = validateSnapshot(valid)
    expect(result.entries[0]).toEqual({ name: '動畫A', status: 'watching', rank: '1' })
  })

  it('拒絕未知版本', () => {
    expect(() => validateSnapshot({ ...valid, version: 99 })).toThrow(SchemaError)
    expect(() => validateSnapshot({ ...valid, version: undefined })).toThrow(SchemaError)
  })

  it('拒絕不合法的模式與季度數量', () => {
    expect(() => validateSnapshot({ ...valid, mode: 'weird' })).toThrow(SchemaError)
    expect(() => validateSnapshot({ ...valid, seasonIds: ['bad-id'] })).toThrow(SchemaError)
    expect(() => validateSnapshot({ ...valid, seasonIds: [] })).toThrow(SchemaError)
    // 單季必須恰為一季
    expect(() =>
      validateSnapshot({ ...valid, seasonIds: ['2026-07', '2026-04'] }),
    ).toThrow(SchemaError)
  })

  it('跨季快照允許一個以上的季度集合，超過上限拒絕', () => {
    const cross = (seasonIds: string[]) =>
      validateSnapshot({ ...valid, mode: 'cross-season', seasonIds })
    expect(cross(['2026-07']).seasonIds).toEqual(['2026-07'])
    expect(cross(['2026-07', '2026-04', '2026-01']).seasonIds.length).toBe(3)
    const tooMany = Array.from({ length: 65 }, (_, i) => `${1900 + i}-07`)
    expect(() => cross(tooMany)).toThrow(SchemaError)
  })

  it('拒絕不合法的狀態值', () => {
    expect(() =>
      validateSnapshot({ ...valid, entries: [{ name: 'A', status: 'show', rank: null }] }),
    ).toThrow(SchemaError)
  })

  it('數字名次會轉為字串，空字串名次轉為 null', () => {
    const result = validateSnapshot({
      ...valid,
      entries: [
        { name: 'A', status: 'planned', rank: 3 },
        { name: 'B', status: 'planned', rank: '' },
      ],
    })
    expect(result.entries[0].rank).toBe('3')
    expect(result.entries[1].rank).toBeNull()
  })
})
