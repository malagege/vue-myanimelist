/**
 * 快照還原流程：頁面切換與分享 query、讀取設定都走同一套（FR-10.4）。
 * 先載入快照指定的季度，再以動畫名稱套用狀態；回傳無法配對的名稱清單。
 */

import type { ListSnapshot } from '../../domain/snapshot'
import { useAnimeCatalog } from '../../stores/animeCatalog'
import { useUserList } from '../../stores/userList'
import { useViewState } from '../../stores/viewState'

export interface RestoreResult {
  missing: string[]
}

export function useSnapshotRestore() {
  const catalog = useAnimeCatalog()
  const userList = useUserList()
  const viewState = useViewState()

  async function restoreSnapshot(
    snapshot: ListSnapshot,
    options: { collapseCrossSeason?: boolean } = {},
  ): Promise<RestoreResult> {
    const seasons = await catalog.ensureSeasons()
    for (const id of snapshot.seasonIds) {
      if (!seasons.some((s) => s.id === id)) {
        throw new Error(`內容使用的季度 ${id} 不存在，無法還原`)
      }
    }
    const loaded = await Promise.all(snapshot.seasonIds.map((id) => catalog.ensureSeason(id)))
    userList.replaceAll(snapshot.entries)
    if (snapshot.mode === 'cross-season') {
      viewState.setCrossSeasonPair(snapshot.seasonIds, {
        collapsed: options.collapseCrossSeason ?? false,
      })
    }
    const knownNames = new Set(loaded.flat().map((item) => item.name))
    const missing = snapshot.entries
      .filter((entry) => !knownNames.has(entry.name))
      .map((entry) => entry.name)
    return { missing }
  }

  return { restoreSnapshot }
}
