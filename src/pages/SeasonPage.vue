<template>
    <AppHeader
        :seasons="catalogState.seasons"
        :current-season-id="selectSeasonId"
        @season-change="onSeasonChange"
    >
        <template #actions>
            <ShareButton :build-snapshot="buildSnapshot" :disabled="!isReady" />
            <PresetManagerButton :build-snapshot="buildSnapshot" :snapshot-ready="isReady" />
        </template>
    </AppHeader>
    <main class="container my-3">
        <div v-if="shareError" class="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
            <span>{{ shareError }}</span>
            <button type="button" class="btn-close" aria-label="關閉" @click="dismissShareError"></button>
        </div>
        <div v-if="missingNames.length" class="alert alert-info d-flex justify-content-between align-items-start" role="alert">
            <span>以下 {{ missingNames.length }} 部動畫在目前資料中找不到，無法還原：{{ missingNames.join('、') }}</span>
            <button type="button" class="btn-close" aria-label="關閉" @click="dismissMissing"></button>
        </div>

        <div v-if="isLoading" class="text-center py-5" role="status">
            <div class="spinner-border" aria-hidden="true"></div>
            <p class="mt-2 text-muted">載入中…</p>
        </div>
        <div v-else-if="loadError" class="alert alert-danger" role="alert">
            <p class="mb-2">動畫資料載入失敗：{{ loadError }}</p>
            <button type="button" class="btn btn-outline-danger btn-sm" @click="retry">重試</button>
        </div>
        <AnimeGrid
            v-else
            :entries="entries"
            @cycle="onCycle"
            @set-rank="onSetRank"
            @clear-rank="onClearRank"
        />
    </main>
</template>
<script>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AnimeGrid from '../components/AnimeGrid.vue'
import ShareButton from '../features/sharing/ShareButton.vue'
import PresetManagerButton from '../features/presets/PresetManagerButton.vue'
import { useAnimeCatalog } from '../stores/animeCatalog'
import { useUserList } from '../stores/userList'
import { useShareQuery } from '../features/sharing/useShareQuery'
import { compareByRank } from '../domain/sort'
import { createSnapshot } from '../domain/snapshot'

export default {
    components: { AppHeader, AnimeGrid, ShareButton, PresetManagerButton },
    props: {
        seasonId: { type: String, required: true },
    },
    setup(props) {
        const route = useRoute()
        const router = useRouter()
        const catalog = useAnimeCatalog()
        const userList = useUserList()
        const { shareError, missingNames, dismissShareError, dismissMissing } = useShareQuery('season')

        catalog.ensureSeasons().catch(() => { /* 錯誤顯示於畫面 */ })

        // 解析 latest 與非法季度：一律把網址導正（FR-02.6）
        watch(
            [() => props.seasonId, () => catalog.state.seasonsStatus],
            () => {
                if (catalog.state.seasonsStatus !== 'ready') return
                if (props.seasonId === 'latest' || !catalog.getSeason(props.seasonId)) {
                    const latest = catalog.latestSeason()
                    if (latest) {
                        const query = props.seasonId === 'latest' ? route.query : {}
                        router.replace({ path: `/season/${latest.id}`, query })
                    }
                    return
                }
                catalog.ensureSeason(props.seasonId).catch(() => { /* 錯誤顯示於畫面 */ })
            },
            { immediate: true },
        )

        const seasonEntry = computed(() => catalog.seasonEntry(props.seasonId))
        const isReady = computed(() => seasonEntry.value?.status === 'ready')
        const isLoading = computed(() => {
            if (catalog.state.seasonsStatus === 'error') return false
            if (catalog.state.seasonsStatus !== 'ready') return true
            if (props.seasonId === 'latest') return true
            const status = seasonEntry.value?.status
            return !status || status === 'idle' || status === 'loading'
        })
        const loadError = computed(() => catalog.state.seasonsError || seasonEntry.value?.error || '')

        // 有名次者在前（數字升冪、非數字次之），其餘依來源順序
        const entries = computed(() => {
            const items = isReady.value ? seasonEntry.value.items : []
            return items
                .map((appearance) => ({ appearance, state: userList.stateFor(appearance.name) }))
                .sort((a, b) => compareByRank(a.state, b.state))
        })

        const selectSeasonId = computed(() =>
            catalog.getSeason(props.seasonId) ? props.seasonId : catalog.latestSeason()?.id ?? '',
        )

        function onSeasonChange(id) {
            router.push(`/season/${id}`)
        }

        function retry() {
            if (catalog.state.seasonsStatus === 'error') {
                catalog.ensureSeasons().catch(() => {})
            } else {
                catalog.ensureSeason(props.seasonId).catch(() => {})
            }
        }

        function buildSnapshot() {
            const items = seasonEntry.value?.items ?? []
            return createSnapshot(
                'season',
                [props.seasonId],
                userList.statesForNames(items.map((item) => item.name)),
            )
        }

        return {
            catalogState: catalog.state,
            shareError,
            missingNames,
            dismissShareError,
            dismissMissing,
            isReady,
            isLoading,
            loadError,
            entries,
            selectSeasonId,
            onSeasonChange,
            retry,
            buildSnapshot,
            onCycle: (name) => userList.cycleStatus(name),
            onSetRank: (name, rank) => userList.setRank(name, rank),
            onClearRank: (name) => userList.clearRank(name),
        }
    },
}
</script>
