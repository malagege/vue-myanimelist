/**
 * 監看路由上的 share query 並套用分享快照。
 * 解碼失敗只顯示錯誤，不影響頁面其餘內容（FR-09.1、FR-09.4）。
 */

import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ListSnapshot, SnapshotMode } from '../../domain/snapshot'
import { decodeShare } from '../../services/shareCodec'
import { useSnapshotRestore } from './useSnapshotRestore'

export function useShareQuery(pageMode: SnapshotMode) {
  const route = useRoute()
  const router = useRouter()
  const { restoreSnapshot } = useSnapshotRestore()

  const shareError = ref('')
  const missingNames = ref<string[]>([])
  let lastApplied = ''

  async function apply(rawValue: string, snapshot: ListSnapshot) {
    if (snapshot.mode !== pageMode) {
      // 分享內容與目前頁面模式不符：導到正確頁面（同一 query 再處理一次）
      const path = snapshot.mode === 'season' ? `/season/${snapshot.seasonIds[0]}` : '/cross-season'
      router.replace({ path, query: { share: rawValue } })
      return
    }
    const result = await restoreSnapshot(snapshot)
    missingNames.value = result.missing
    if (snapshot.mode === 'season' && route.params.seasonId !== snapshot.seasonIds[0]) {
      // 網址季度與快照不一致時修正網址（狀態已在 store，不需重套）
      router.replace({ path: `/season/${snapshot.seasonIds[0]}`, query: route.query })
    }
  }

  watch(
    () => route.query.share,
    async (value) => {
      if (typeof value !== 'string' || !value || value === lastApplied) return
      lastApplied = value
      shareError.value = ''
      missingNames.value = []
      try {
        await apply(value, decodeShare(value))
      } catch (e) {
        shareError.value = e instanceof Error ? e.message : String(e)
      }
    },
    { immediate: true },
  )

  function dismissShareError() {
    shareError.value = ''
  }

  function dismissMissing() {
    missingNames.value = []
  }

  return { shareError, missingNames, dismissShareError, dismissMissing }
}
