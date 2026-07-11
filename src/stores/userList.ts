/**
 * 使用者觀看狀態與排名 store。
 * 以動畫名稱為 key（產品決策：暫不建立 alias/canonical ID）；
 * 元件不得直接修改，一律透過這裡的 action。
 */

import { reactive } from 'vue'
import type { UserAnimeState, WatchStatus } from '../domain/snapshot'
import { nextStatus, isMeaningfulState } from '../domain/snapshot'

interface EntryValue {
  status: WatchStatus
  rank: string | null
}

const state = reactive({
  entries: {} as Record<string, EntryValue>,
})

function stateFor(name: string): UserAnimeState {
  const entry = state.entries[name]
  return {
    name,
    status: entry?.status ?? 'unselected',
    rank: entry?.rank ?? null,
  }
}

function write(name: string, value: EntryValue) {
  if (value.status === 'unselected' && value.rank === null) {
    delete state.entries[name]
  } else {
    state.entries[name] = value
  }
}

/** 左鍵／Enter／Space：依序循環五種觀看狀態。 */
function cycleStatus(name: string) {
  const current = stateFor(name)
  write(name, { status: nextStatus(current.status), rank: current.rank })
}

/** 設定名次；空白視為清除。不做阻擋式格式驗證（產品決策 3）。 */
function setRank(name: string, rank: string | null) {
  const current = stateFor(name)
  const normalized = rank === null ? null : rank.trim()
  write(name, { status: current.status, rank: normalized ? normalized : null })
}

function clearRank(name: string) {
  setRank(name, null)
}

/** 還原快照：取代所有現有狀態（讀取設定／開啟分享連結）。 */
function replaceAll(entries: UserAnimeState[]) {
  for (const key of Object.keys(state.entries)) delete state.entries[key]
  for (const entry of entries) {
    if (isMeaningfulState(entry)) {
      state.entries[entry.name] = { status: entry.status, rank: entry.rank }
    }
  }
}

/** 取出指定名稱集合中有意義的狀態（分享／儲存設定用的最小資料）。 */
function statesForNames(names: Iterable<string>): UserAnimeState[] {
  const seen = new Set<string>()
  const out: UserAnimeState[] = []
  for (const name of names) {
    if (seen.has(name)) continue
    seen.add(name)
    const entry = state.entries[name]
    if (entry) {
      const value = { name, status: entry.status, rank: entry.rank }
      if (isMeaningfulState(value)) out.push(value)
    }
  }
  return out
}

export function useUserList() {
  return { state, stateFor, cycleStatus, setRank, clearRank, replaceAll, statesForNames }
}
