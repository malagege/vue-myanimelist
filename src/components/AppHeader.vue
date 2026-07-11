<template>
    <nav class="navbar navbar-light bg-light app-header">
        <div class="container justify-content-start flex-wrap gap-2">
            <router-link class="navbar-brand" to="/">我的新番清單</router-link>
            <ul class="navbar-nav me-auto align-items-center">
                <li class="nav-item" v-if="currentSeasonId && seasons.length">
                    <select
                        class="form-select form-select-sm"
                        aria-label="選擇季度"
                        :value="currentSeasonId"
                        @change="$emit('season-change', $event.target.value)"
                    >
                        <option v-for="season in seasons" :key="season.id" :value="season.id">
                            {{ season.label }}
                        </option>
                    </select>
                </li>
                <li class="nav-item">
                    <router-link to="/season/latest" class="nav-link" :class="{ active: isSeasonPage }">月份清單</router-link>
                </li>
                <li class="nav-item">
                    <router-link to="/cross-season" class="nav-link" :class="{ active: isCrossSeasonPage }">每季清單</router-link>
                </li>
            </ul>
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <slot name="actions"></slot>
            </div>
        </div>
    </nav>
</template>
<script>
export default {
    props: {
        seasons: { type: Array, default: () => [] },
        currentSeasonId: { type: String, default: '' },
    },
    emits: ['season-change'],
    computed: {
        isSeasonPage() {
            return this.$route.path.startsWith('/season/')
        },
        isCrossSeasonPage() {
            return this.$route.path.startsWith('/cross-season')
        },
    },
}
</script>
<style scoped>
.navbar-nav {
    flex-direction: row;
    gap: 4px;
}

.nav-link {
    padding-left: 8px;
    padding-right: 8px;
}
</style>
