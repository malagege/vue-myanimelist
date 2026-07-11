/**
 * 跨頁共享的畫面狀態（不寫入網址，FR-10.3）。
 * 跨季頁比較的兩季與收合狀態：收合只影響畫面，不影響使用者選擇（FR-05.5）。
 */

import { reactive } from 'vue'

const state = reactive({
  crossSeasonPair: null as string[] | null,
  crossCollapsed: {} as Record<string, boolean>,
})

function setCrossSeasonPair(seasonIds: string[], options: { collapsed?: boolean } = {}) {
  state.crossSeasonPair = [...seasonIds]
  const collapsed = options.collapsed ?? false
  state.crossCollapsed = Object.fromEntries(seasonIds.map((id) => [id, collapsed]))
}

function toggleCollapsed(seasonId: string) {
  state.crossCollapsed[seasonId] = !state.crossCollapsed[seasonId]
}

export function useViewState() {
  return { state, setCrossSeasonPair, toggleCollapsed }
}
