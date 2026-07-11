import { describe, it, expect } from 'vitest'
// @ts-expect-error 純 JS 模組
import {
  generateSeasonIds,
  seasonForDate,
  acgnUrlOf,
  normalizeAcgnRecord,
  normalizeSeasonData,
  assertSeasonOutput,
  buildSeasonMenu,
} from '../scripts/data-update/lib.mjs'

describe('季度產生器', () => {
  it('由起始季度產生到當前季度，順序由新到舊', () => {
    const ids = generateSeasonIds('2025-10', new Date(2026, 6, 11)) // 2026-07-11
    expect(ids).toEqual(['2026-07', '2026-04', '2026-01', '2025-10'])
  })

  it('預設起點 2019-10 到 2026-07 共 28 季', () => {
    const ids = generateSeasonIds('2019-10', new Date(2026, 6, 1))
    expect(ids.length).toBe(28)
    expect(ids[0]).toBe('2026-07')
    expect(ids[ids.length - 1]).toBe('2019-10')
  })

  it('月份向下取到 1/4/7/10', () => {
    expect(seasonForDate(new Date(2026, 2, 31))).toEqual({ year: 2026, month: 1 }) // 3月
    expect(seasonForDate(new Date(2026, 8, 1))).toEqual({ year: 2026, month: 7 }) // 9月
    expect(seasonForDate(new Date(2026, 11, 31))).toEqual({ year: 2026, month: 10 }) // 12月
  })

  it('拒絕不合法或晚於當前的起始季度', () => {
    expect(() => generateSeasonIds('2026-3', new Date(2026, 6, 1))).toThrow()
    expect(() => generateSeasonIds('2027-01', new Date(2026, 6, 1))).toThrow()
  })

  it('ACGNTaiwan 來源網址', () => {
    expect(acgnUrlOf('2026-07')).toBe(
      'https://acgntaiwan.github.io/Anime-List/anime-data/anime2026.07.json',
    )
  })
})

describe('ACGNTaiwan 正規化', () => {
  const fixture = {
    name: ' 二十世紀電氣目錄 ',
    date: '7/5',
    time: '23:00',
    carrier: 'Novel',
    season: 1,
    originalName: '二十世紀電氣目録',
    img: 'anime-data/img/x.jpg',
    official: 'https://denkimokuroku.jp/',
    description: '簡介文字',
  }

  it('正常資料：欄位改名、trim、相對圖片網址補上網域', () => {
    const item = normalizeAcgnRecord(fixture, 0)
    expect(item).toEqual({
      name: '二十世紀電氣目錄',
      originalTitle: '二十世紀電氣目録',
      imageUrl: 'https://acgntaiwan.github.io/Anime-List/anime-data/img/x.jpg',
      description: '簡介文字',
      staff: '',
      officialUrl: 'https://denkimokuroku.jp/',
      airDate: '7/5',
      airTime: '23:00',
      sourceOrder: 0,
    })
  })

  it('絕對圖片網址不變', () => {
    const item = normalizeAcgnRecord({ ...fixture, img: 'https://example.com/a.jpg' }, 3)
    expect(item.imageUrl).toBe('https://example.com/a.jpg')
    expect(item.sourceOrder).toBe(3)
  })

  it('缺名稱或非物件資料回傳 null', () => {
    expect(normalizeAcgnRecord({ ...fixture, name: '  ' }, 0)).toBeNull()
    expect(normalizeAcgnRecord(null, 0)).toBeNull()
    expect(normalizeAcgnRecord('str', 0)).toBeNull()
  })

  it('整季正規化：略過壞資料並記錄警告，sourceOrder 重新連號', () => {
    const { items, warnings } = normalizeSeasonData([fixture, { name: '' }, { ...fixture, name: 'B' }], '2026-07')
    expect(items.length).toBe(2)
    expect(items[1].sourceOrder).toBe(1)
    expect(warnings.length).toBe(1)
  })

  it('來源不是陣列或整季為空時擋下', () => {
    expect(() => normalizeSeasonData({ not: 'array' }, '2026-07')).toThrow()
    expect(() => assertSeasonOutput([], '2026-07')).toThrow()
  })
})

describe('季度選單輸出', () => {
  it('組出正確 Season 物件', () => {
    expect(buildSeasonMenu(['2026-07'])).toEqual([
      {
        id: '2026-07',
        label: '2026年7月新番',
        year: 2026,
        month: 7,
        dataUrl: 'data/seasons/2026-07.json',
      },
    ])
  })
})
