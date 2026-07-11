/**
 * 名次排序規則（FR-04.3 / FR-05.2）：
 * 1. 可轉為有限數字的名次依數值升冪。
 * 2. 無法轉成數字的名次列在數字名次之後。
 * 3. 未排名者最後。
 * 同組之內一律維持呼叫端提供的來源順序（依賴 Array.prototype.sort 的穩定性）。
 */

export interface Rankable {
  rank: string | null
}

function rankGroup(rank: string | null): number {
  if (rank === null || rank === '') return 2
  return Number.isFinite(Number(rank)) ? 0 : 1
}

export function compareByRank(a: Rankable, b: Rankable): number {
  const groupA = rankGroup(a.rank)
  const groupB = rankGroup(b.rank)
  if (groupA !== groupB) return groupA - groupB
  if (groupA === 0) return Number(a.rank) - Number(b.rank)
  return 0
}

/** 回傳新陣列，不改動輸入（輸入順序即來源順序）。 */
export function sortByRank<T extends Rankable>(items: T[]): T[] {
  return [...items].sort(compareByRank)
}
