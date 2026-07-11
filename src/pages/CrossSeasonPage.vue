<template>
    <AppHeader :seasons="catalogState.seasons">
        <template #actions>
            <ShareButton :build-snapshot="buildSnapshot" :disabled="!anySeasonReady" />
            <PresetManagerButton :build-snapshot="buildSnapshot" :snapshot-ready="anySeasonReady" />
        </template>
    </AppHeader>
    <main class="my-3">
        <div class="container">
            <div v-if="shareError" class="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
                <span>{{ shareError }}</span>
                <button type="button" class="btn-close" aria-label="關閉" @click="dismissShareError"></button>
            </div>
            <div v-if="missingNames.length" class="alert alert-info d-flex justify-content-between align-items-start" role="alert">
                <span>以下 {{ missingNames.length }} 部動畫在目前資料中找不到，無法還原：{{ missingNames.join('、') }}</span>
                <button type="button" class="btn-close" aria-label="關閉" @click="dismissMissing"></button>
            </div>
            <div v-if="seasonsError" class="alert alert-danger" role="alert">
                <p class="mb-2">季度選單載入失敗：{{ seasonsError }}</p>
                <button type="button" class="btn btn-outline-danger btn-sm" @click="retrySeasons">重試</button>
            </div>
            <div v-if="seasonsLoading" class="text-center py-5" role="status">
                <div class="spinner-border" aria-hidden="true"></div>
                <p class="mt-2 text-muted">載入中…</p>
            </div>
        </div>

        <!-- 上方彙整清單：所有已載入季度共用一份（FR-05.2） -->
        <section v-if="!seasonsLoading" class="position-relative" aria-label="我的排名清單">
            <div class="section-title position-sticky text-center bg-white">
                <h1 class="h3 my-2">我的排名清單</h1>
            </div>
            <div class="container-fluid">
                <AnimeGrid
                    :entries="aggregateEntries"
                    empty-text="尚未選取或排名任何動畫；展開下方季度並點擊動畫卡片開始"
                    @cycle="onCycle"
                    @set-rank="onSetRank"
                    @clear-rank="onClearRank"
                />
            </div>
        </section>

        <!-- 所有季度區塊：預設展開最新兩季，其餘收合；展開時才載入（FR-05.1） -->
        <section
            v-for="season in catalogState.seasons"
            :key="season.id"
            class="position-relative"
            :aria-label="season.label"
        >
            <div class="section-title position-sticky text-center bg-white">
                <button
                    type="button"
                    class="season-toggle h3 my-2"
                    :aria-expanded="String(isExpanded(season.id))"
                    @click="toggle(season.id)"
                >
                    {{ season.label }}
                    <span class="toggle-hint">{{ isExpanded(season.id) ? '（點擊收合）' : '（點擊展開）' }}</span>
                </button>
            </div>
            <div v-show="isExpanded(season.id)" class="container-fluid">
                <div v-if="seasonStatus(season.id) === 'loading' || seasonStatus(season.id) === 'idle'" class="text-center py-4" role="status">
                    <div class="spinner-border" aria-hidden="true"></div>
                    <p class="mt-2 text-muted">載入中…</p>
                </div>
                <div v-else-if="seasonStatus(season.id) === 'error'" class="alert alert-danger" role="alert">
                    <p class="mb-2">{{ season.label }}載入失敗：{{ seasonError(season.id) }}</p>
                    <button type="button" class="btn btn-outline-danger btn-sm" @click="retrySeason(season.id)">重試</button>
                </div>
                <AnimeGrid
                    v-else
                    :entries="seasonEntries(season.id)"
                    @cycle="onCycle"
                    @set-rank="onSetRank"
                    @clear-rank="onClearRank"
                />
            </div>
        </section>
    </main>
</template>
<script>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AnimeGrid from '../components/AnimeGrid.vue'
import ShareButton from '../features/sharing/ShareButton.vue'
import PresetManagerButton from '../features/presets/PresetManagerButton.vue'
import { useAnimeCatalog } from '../stores/animeCatalog'
import { useUserList } from '../stores/userList'
import { useViewState } from '../stores/viewState'
import { useShareQuery } from '../features/sharing/useShareQuery'
import { compareByRank } from '../domain/sort'
import { createSnapshot, isMeaningfulState } from '../domain/snapshot'

export default {
    components: { AppHeader, AnimeGrid, ShareButton, PresetManagerButton },
    setup() {
        const route = useRoute()
        const catalog = useAnimeCatalog()
        const userList = useUserList()
        const viewState = useViewState()
        const { shareError, missingNames, dismissShareError, dismissMissing } = useShareQuery('cross-season')

        // 預設展開最新兩季；由分享／設定還原時 restore 流程會覆寫展開集合
        catalog
            .ensureSeasons()
            .then((seasons) => {
                if (!route.query.share) {
                    viewState.initCrossDefaults(seasons.slice(0, 2).map((s) => s.id))
                }
            })
            .catch(() => { /* 錯誤顯示於畫面 */ })

        const menuIds = computed(() => catalog.state.seasons.map((s) => s.id))
        const expandedIds = computed(() => viewState.expandedIn(menuIds.value))

        // 展開的季度才載入資料（lazy load）
        watch(
            expandedIds,
            (ids) => {
                ids.forEach((id) => catalog.ensureSeason(id).catch(() => { /* 錯誤顯示於畫面 */ }))
            },
            { immediate: true },
        )

        const seasonsLoading = computed(
            () => catalog.state.seasonsStatus === 'idle' || catalog.state.seasonsStatus === 'loading',
        )
        const seasonsError = computed(() =>
            catalog.state.seasonsStatus === 'error' ? catalog.state.seasonsError : '',
        )

        function entryOf(seasonId) {
            return catalog.seasonEntry(seasonId)
        }

        /** 已載入（ready）的季度，依選單順序（新到舊）。 */
        const readyIds = computed(() =>
            menuIds.value.filter((id) => entryOf(id)?.status === 'ready'),
        )

        const aggregateEntries = computed(() => {
            const rows = []
            for (const seasonId of readyIds.value) {
                for (const appearance of entryOf(seasonId).items) {
                    const state = userList.stateFor(appearance.name)
                    if (isMeaningfulState(state)) rows.push({ appearance, state })
                }
            }
            return rows.sort((a, b) => compareByRank(a.state, b.state))
        })

        const anySeasonReady = computed(() => readyIds.value.length > 0)

        function seasonEntries(seasonId) {
            const entry = entryOf(seasonId)
            const items = entry?.status === 'ready' ? entry.items : []
            return items
                .map((appearance) => ({ appearance, state: userList.stateFor(appearance.name) }))
                .sort((a, b) => compareByRank(a.state, b.state))
        }

        /**
         * 分享／設定只保存有產品意義的季度（FR-05.6）：
         * 目前展開的季度，加上雖收合但含有已選狀態作品的已載入季度。
         */
        function buildSnapshot() {
            const meaningful = new Set(expandedIds.value)
            for (const seasonId of readyIds.value) {
                if (meaningful.has(seasonId)) continue
                const hasState = entryOf(seasonId).items.some((item) =>
                    isMeaningfulState(userList.stateFor(item.name)),
                )
                if (hasState) meaningful.add(seasonId)
            }
            let seasonIds = menuIds.value.filter((id) => meaningful.has(id))
            if (seasonIds.length === 0) {
                seasonIds = menuIds.value.slice(0, 2)
            }
            const names = []
            for (const seasonId of seasonIds) {
                const entry = entryOf(seasonId)
                if (entry?.status === 'ready') names.push(...entry.items.map((item) => item.name))
            }
            return createSnapshot('cross-season', seasonIds, userList.statesForNames(names))
        }

        return {
            catalogState: catalog.state,
            shareError,
            missingNames,
            dismissShareError,
            dismissMissing,
            seasonsLoading,
            seasonsError,
            aggregateEntries,
            anySeasonReady,
            seasonEntries,
            buildSnapshot,
            seasonStatus: (id) => entryOf(id)?.status ?? 'idle',
            seasonError: (id) => entryOf(id)?.error ?? '',
            isExpanded: (id) => viewState.isCrossExpanded(id),
            toggle: (id) => viewState.toggleCrossExpanded(id),
            retrySeasons: () => catalog.ensureSeasons().catch(() => {}),
            retrySeason: (id) => catalog.ensureSeason(id).catch(() => {}),
            onCycle: (name) => userList.cycleStatus(name),
            onSetRank: (name, rank) => userList.setRank(name, rank),
            onClearRank: (name) => userList.clearRank(name),
        }
    },
}
</script>
<style scoped>
.section-title {
    top: 0;
    z-index: 999;
}

.season-toggle {
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
}

.toggle-hint {
    font-size: .8rem;
    color: #6c757d;
}
</style>
