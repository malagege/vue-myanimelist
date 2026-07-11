import { createRouter, createWebHashHistory } from 'vue-router'
import SeasonPage from '../pages/SeasonPage.vue'
import CrossSeasonPage from '../pages/CrossSeasonPage.vue'
import NotFoundPage from '../pages/NotFoundPage.vue'
import { legacyPathToSeasonId } from '../domain/season'

const routes = [
    { path: '/', redirect: '/season/latest' },
    { path: '/season/:seasonId', component: SeasonPage, props: true },
    { path: '/cross-season', component: CrossSeasonPage },
    // 相容層：舊路由導向新頁面；舊純 Base64 分享 payload 不解析（FR-10.2、產品決策 9）
    { path: '/all/:openAnimeList*', redirect: () => ({ path: '/cross-season', hash: '' }) },
    {
        path: '/:legacyPath(\\d{6})',
        redirect: (to) => {
            const seasonId = legacyPathToSeasonId(String(to.params.legacyPath))
            return { path: seasonId ? `/season/${seasonId}` : '/season/latest', hash: '' }
        },
    },
    { path: '/:pathMatch(.*)*', component: NotFoundPage },
]

export default createRouter({
    // GitHub Pages 繼續使用 hash history（FR-08.6）
    history: createWebHashHistory(),
    routes,
})
