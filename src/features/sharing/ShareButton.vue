<template>
    <div class="share-button d-flex align-items-center">
        <button type="button" class="btn btn-sm btn-outline-primary" :disabled="disabled" @click="share">
            複製分享連結
        </button>
        <span v-if="feedback" class="share-feedback ms-2" :class="feedbackKind" role="status">{{ feedback }}</span>
    </div>
</template>
<script>
import { encodeShare } from '../../services/shareCodec'
import { copyText } from '../../services/clipboard'

export default {
    props: {
        // 回傳目前頁面的 ListSnapshot；由頁面提供（頁面組合 use case，元件不碰 store）
        buildSnapshot: { type: Function, required: true },
        disabled: { type: Boolean, default: false },
    },
    data() {
        return { feedback: '', feedbackKind: 'ok', feedbackTimer: null }
    },
    methods: {
        async share() {
            try {
                const snapshot = this.buildSnapshot()
                const encoded = encodeShare(snapshot)
                const resolved = this.$router.resolve({ path: this.$route.path, query: { share: encoded } })
                const url = location.origin + location.pathname + location.search + resolved.href
                await copyText(url)
                this.showFeedback('已複製分享連結！', 'ok')
            } catch (e) {
                this.showFeedback(`複製失敗：${e instanceof Error ? e.message : e}`, 'err')
            }
        },
        showFeedback(text, kind) {
            this.feedback = text
            this.feedbackKind = kind
            clearTimeout(this.feedbackTimer)
            this.feedbackTimer = setTimeout(() => { this.feedback = '' }, 4000)
        },
    },
    beforeUnmount() {
        clearTimeout(this.feedbackTimer)
    },
}
</script>
<style scoped>
.share-feedback.ok { color: #198754; }
.share-feedback.err { color: #dc3545; }
.share-feedback { font-size: .875rem; }
</style>
