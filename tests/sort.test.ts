import { describe, it, expect } from 'vitest'
import { sortByRank } from '../src/domain/sort'

function names(items: { name: string; rank: string | null }[]) {
  return items.map((i) => i.name)
}

describe('sortByRank', () => {
  it('數字名次依數值升冪排列', () => {
    const result = sortByRank([
      { name: 'C', rank: '10' },
      { name: 'A', rank: '2' },
      { name: 'B', rank: '1' },
    ])
    expect(names(result)).toEqual(['B', 'A', 'C'])
  })

  it('重複名次依來源順序保持穩定', () => {
    const result = sortByRank([
      { name: 'first', rank: '1' },
      { name: 'second', rank: '1' },
      { name: 'third', rank: '1' },
    ])
    expect(names(result)).toEqual(['first', 'second', 'third'])
  })

  it('非數字名次列在數字名次之後、未排名之前，且維持來源順序', () => {
    const result = sortByRank([
      { name: 'none1', rank: null },
      { name: 'textB', rank: '神作' },
      { name: 'num2', rank: '2' },
      { name: 'textA', rank: 'S級' },
      { name: 'none2', rank: null },
      { name: 'num1', rank: '1' },
    ])
    expect(names(result)).toEqual(['num1', 'num2', 'textB', 'textA', 'none1', 'none2'])
  })

  it('小數與負數名次可正確比較', () => {
    const result = sortByRank([
      { name: 'a', rank: '1.5' },
      { name: 'b', rank: '-1' },
      { name: 'c', rank: '1' },
    ])
    expect(names(result)).toEqual(['b', 'c', 'a'])
  })

  it('不改動輸入陣列', () => {
    const input = [
      { name: 'x', rank: '2' },
      { name: 'y', rank: '1' },
    ]
    sortByRank(input)
    expect(names(input)).toEqual(['x', 'y'])
  })
})
