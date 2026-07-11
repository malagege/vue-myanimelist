import { describe, it, expect } from 'vitest'
import {
  isSeasonId,
  parseSeasonId,
  seasonId,
  seasonLabel,
  legacyPathToSeasonId,
  legacyLabelToSeasonId,
} from '../src/domain/season'

describe('season id 工具', () => {
  it('驗證季度 id 格式', () => {
    expect(isSeasonId('2026-07')).toBe(true)
    expect(isSeasonId('2019-10')).toBe(true)
    expect(isSeasonId('2026-7')).toBe(false)
    expect(isSeasonId('2026-02')).toBe(false)
    expect(isSeasonId('202607')).toBe(false)
  })

  it('parse 與組合互為反函式', () => {
    expect(parseSeasonId('2026-07')).toEqual({ year: 2026, month: 7 })
    expect(seasonId(2026, 7)).toBe('2026-07')
    expect(seasonId(2019, 10)).toBe('2019-10')
  })

  it('顯示名稱', () => {
    expect(seasonLabel('2026-07')).toBe('2026年7月新番')
    expect(seasonLabel('2019-10')).toBe('2019年10月新番')
  })

  it('舊路由轉換', () => {
    expect(legacyPathToSeasonId('202607')).toBe('2026-07')
    expect(legacyPathToSeasonId('201910')).toBe('2019-10')
    expect(legacyPathToSeasonId('202602')).toBeNull()
    expect(legacyPathToSeasonId('abc')).toBeNull()
  })

  it('舊季度名稱轉換', () => {
    expect(legacyLabelToSeasonId('2026年7月新番')).toBe('2026-07')
    expect(legacyLabelToSeasonId('2019年10月新番')).toBe('2019-10')
    expect(legacyLabelToSeasonId('2026年2月新番')).toBeNull()
  })
})
