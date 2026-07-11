<template>
    <AppHeader :seasons="catalogState.seasons">
        <template #actions>
            <ShareButton :build-snapshot="buildSnapshot" :disabled="!anySeasonReady" />
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
        </div>

        <!-- 上方彙整清單：兩季共用一份（FR-05.2） -->
        <section class="position-relative" aria-label="我的排名清單">
            <div class="section-title position-sticky text-center bg-white">
                <h1 class="h3 my-2">我的排名清單</h1>
            </div>
            <div class="container-fluid">
                <AnimeGrid
                    :entries="aggregateEntries"
                    empty-text="尚未選取或排名任何動畫；點擊下方動畫卡片開始"
                    @cycle="onCycle"
                    @set-rank="onSetRank"
                    @clear-rank="onClearRank"
                />
            </div>
        </section>

        <!-- 兩個季度區塊（FR-05.1：固定比較兩季，可展開收合） -->
        <section v-for="seasonId in pair" :key="seasonId" class="position-relative" :aria-label="seasonLabelOf(seasonId)">
            <div class="section-title position-sticky text-center bg-white">
                <button
                    type="button"
                    class="season-toggle h3 my-2"
                    :aria-expanded="String(!isCollapsed(seasonId))"
                    @click="toggleCollapsed(seasonId)"
                >
                    {{ seasonLabelOf(seasonId) }}
                    <span class="toggle-hint">{{ isCollapsed(seasonId) ? '（點擊展開）' : '（點擊收合）' }}</span>
                </button>
            </div>
            <div v-show="!isCollapsed(seasonId)" class="container-fluid">
                <div v-if="seasonStatus(seasonId) === 'loading' || seasonStatus(seasonId) === 'idle'" class="text-center py-4" role="status">
                    <div class="spinner-border" aria-hidden="true"></div>
                    <p class="mt-2 text-muted">載入中…</p>
                </div>
                <div v-else-if="seasonStatus(seasonId) === 'error'" class="alert alert-danger" role="alert">
                    <p class="mb-2">{{ seasonLabelOf(seasonId) }}載入失敗：{{ seasonError(seasonId) }}</p>
                    <button type="button" class="btn btn-outline-danger btn-sm" @click="retrySeason(seasonId)">重試</button>
                </div>
                <AnimeGrid
                    v-else
                    :entries="seasonEntries(seasonId)"
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
import { useAnimeCatalog } from '../stores/animeCatalog'
import { useUserList } from '../stores/userList'
import { useViewState } from '../stores/viewState'
import { useShareQuery } from '../features/sharing/useShareQuery'
import { compareByRank } from '../domain/sort'
import { createSnapshot, isMeaningfulState } from '../domain/snapshot'
import { seasonLabel } from '../domain/season'

export default {
    components: { AppHeader, AnimeGrid, ShareButton },
    setup() {
        const route = useRoute()
        const catalog = useAnimeCatalog()
        const userList = useUserList()
        const viewState = useViewState()
        const { shareError, missingNames, dismissShareError, dismissMissing } = useShareQuery('cross-season')

        // 預設比較最新兩季；由分享／設定還原時 restore 流程會覆寫 pair（FR-05.1）
        catalog
            .ensureSeasons()
            .then((seasons) => {
                if (!viewState.state.crossSeasonPair && !route.query.share) {
                    viewState.setCrossSeasonPair(seasons.slice(0, 2).map((s) => s.id))
                }
            })
            .catch(() => { /* 錯誤顯示於畫面 */ })

        const pair = computed(() => viewState.state.crossSeasonPair ?? [])

        watch(
            pair,
            (ids) => {
                ids.forEach((id) => catalog.ensureSeason(id).catch(() => { /* 錯誤顯示於畫面 */ }))
            },
            { immediate: true },
        )

        const seasonsError = computed(() =>
            catalog.state.seasonsStatus === 'error' ? catalog.state.seasonsError : '',
        )

        function entryOf(seasonId) {
            return catalog.seasonEntry(seasonId)
        }

        const aggregateEntries = computed(() => {
            const rows = []
            for (const seasonId of pair.value) {
                const entry = entryOf(seasonId)
                if (!entry || entry.status !== 'ready') continue
                for (const appearance of entry.items) {
                    const state = userList.stateFor(appearance.name)
                    if (isMeaningfulState(state)) rows.push({ appearance, state })
                }
            }
            return rows.sort((a, b) => compareByRank(a.state, b.state))
        })

        const anySeasonReady = computed(() =>
            pair.value.some((id) => entryOf(id)?.status === 'ready'),
        )

        function seasonEntries(seasonId) {
            const entry = entryOf(seasonId)
            const items = entry?.status === 'ready' ? entry.items : []
            return items
                .map((appearance) => ({ appearance, state: userList.stateFor(appearance.name) }))
                .sort((a, b) => compareByRank(a.state, b.state))
        }

        function buildSnapshot() {
            const names = []
            for (const seasonId of pair.value) {
                const entry = entryOf(seasonId)
                if (entry?.status === 'ready') names.push(...entry.items.map((item) => item.name))
            }
            return createSnapshot('cross-season', pair.value, userList.statesForNames(names))
        }

        return {
            catalogState: catalog.state,
            shareError,
            missingNames,
            dismissShareError,
            dismissMissing,
            seasonsError,
            pair,
            aggregateEntries,
            anySeasonReady,
            seasonEntries,
            buildSnapshot,
            seasonLabelOf: (id) => catalog.getSeason(id)?.label ?? seasonLabel(id),
            seasonStatus: (id) => entryOf(id)?.status ?? 'idle',
            seasonError: (id) => entryOf(id)?.error ?? '',
            isCollapsed: (id) => !!viewState.state.crossCollapsed[id],
            toggleCollapsed: (id) => viewState.toggleCollapsed(id),
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
