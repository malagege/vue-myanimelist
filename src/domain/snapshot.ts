/**
 * UserAnimeState 與 ListSnapshot：使用者觀看狀態、排名與可分享快照。
 */

export const WATCH_STATUSES = ['unselected', 'planned', 'watching', 'completed', 'dropped'] as const
export type WatchStatus = (typeof WATCH_STATUSES)[number]

/** 左鍵／Enter／Space 的循環順序：棄番之後回到未選取。 */
export function nextStatus(status: WatchStatus): WatchStatus {
  const index = WATCH_STATUSES.indexOf(status)
  return WATCH_STATUSES[(index + 1) % WATCH_STATUSES.length]
}

export const STATUS_LABELS: Record<WatchStatus, string> = {
  unselected: '未選取',
  planned: '想看',
  watching: '觀看中',
  completed: '看完',
  dropped: '棄番',
}

export interface UserAnimeState {
  name: string
  status: WatchStatus
  rank: string | null
}

export const SNAPSHOT_VERSION = 2

export type SnapshotMode = 'season' | 'cross-season'

export interface ListSnapshot {
  version: number
  mode: SnapshotMode
  seasonIds: string[]
  entries: UserAnimeState[]
}

/** 只有非未選取、或已有名次的項目才有保存意義。 */
export function isMeaningfulState(state: UserAnimeState): boolean {
  return state.status !== 'unselected' || state.rank !== null
}

export function createSnapshot(
  mode: SnapshotMode,
  seasonIds: string[],
  entries: UserAnimeState[],
): ListSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    mode,
    seasonIds: [...seasonIds],
    entries: entries.filter(isMeaningfulState).map((entry) => ({
      name: entry.name,
      status: entry.status,
      rank: entry.rank,
    })),
  }
}
