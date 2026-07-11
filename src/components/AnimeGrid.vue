<template>
    <div v-if="entries.length" class="anime-grid">
        <AnimeCard
            v-for="entry in entries"
            :key="entryKey(entry)"
            :appearance="entry.appearance"
            :status="entry.state.status"
            :rank="entry.state.rank"
            @cycle="$emit('cycle', entry.appearance.name)"
            @set-rank="$emit('set-rank', entry.appearance.name, $event)"
            @clear-rank="$emit('clear-rank', entry.appearance.name)"
        />
    </div>
    <p v-else class="anime-grid__empty text-muted text-center py-4 mb-0">{{ emptyText }}</p>
</template>
<script>
import AnimeCard from './AnimeCard.vue'
import { appearanceKey } from '../domain/anime'

export default {
    components: { AnimeCard },
    props: {
        // Array<{ appearance: AnimeAppearance, state: UserAnimeState }>
        entries: { type: Array, required: true },
        emptyText: { type: String, default: '這一季目前沒有任何動畫資料' },
    },
    emits: ['cycle', 'set-rank', 'clear-rank'],
    methods: {
        entryKey(entry) {
            // 同名跨季可能重複，key 使用 seasonId + name（spec 3.2）
            return appearanceKey(entry.appearance)
        },
    },
}
</script>
<style scoped>
.anime-grid {
    display: grid;
    background: rgb(192, 192, 192);
    gap: 2px;
    /* 響應式：窄螢幕自動減欄，不產生水平捲動（FR-03.6） */
    grid-template-columns: repeat(auto-fill, minmax(min(275px, 100%), 1fr));
}
</style>
