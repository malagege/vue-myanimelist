/**
 * 跨頁共享的畫面狀態（不寫入網址，FR-10.3）。
 * 跨季頁各季度的展開狀態：收合只影響畫面，不影響使用者選擇（FR-05.5）。
 */

import { reactive } from 'vue'

const state = reactive({
  crossExpanded: {} as Record<string, boolean>,
  crossInitialized: false,
})

/** 首次進入跨季頁時的預設：展開最新兩季（FR-05.1）。已初始化過則不動。 */
function initCrossDefaults(defaultExpandedIds: string[]) {
  if (state.crossInitialized) return
  state.crossInitialized = true
  state.crossExpanded = Object.fromEntries(defaultExpandedIds.map((id) => [id, true]))
}

/** 還原分享／設定：只展開指定季度，其餘收合（FR-09.8）。 */
function setCrossExpanded(seasonIds: string[]) {
  state.crossInitialized = true
  state.crossExpanded = Object.fromEntries(seasonIds.map((id) => [id, true]))
}

function toggleCrossExpanded(seasonId: string) {
  state.crossExpanded[seasonId] = !state.crossExpanded[seasonId]
}

function isCrossExpanded(seasonId: string): boolean {
  return !!state.crossExpanded[seasonId]
}

/** 目前展開中的季度（依呼叫端提供的順序過濾）。 */
function expandedIn(orderedIds: string[]): string[] {
  return orderedIds.filter((id) => !!state.crossExpanded[id])
}

export function useViewState() {
  return { state, initCrossDefaults, setCrossExpanded, toggleCrossExpanded, isCrossExpanded, expandedIn }
}
