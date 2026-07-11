<template>
    <AppHeader />
    <main class="container my-5 text-center">
        <h1 class="display-6">404：找不到這個頁面</h1>
        <p class="text-muted">網址可能已失效或輸入錯誤。</p>
        <div class="d-flex justify-content-center gap-2">
            <router-link class="btn btn-primary" to="/season/latest">前往最新季度</router-link>
            <router-link class="btn btn-outline-secondary" to="/cross-season">每季清單</router-link>
        </div>
    </main>
</template>
<script>
import AppHeader from '../components/AppHeader.vue'

export default {
    components: { AppHeader },
}
</script>
