<template>
    <article
        class="anime-card"
        :class="`is-${status}`"
        role="button"
        tabindex="0"
        :aria-label="ariaLabel"
        @click="$emit('cycle')"
        @keydown.enter.prevent="$emit('cycle')"
        @keydown.space.prevent="$emit('cycle')"
        @contextmenu.prevent="promptRank"
    >
        <div class="anime-card__dim" v-if="status === 'unselected'" aria-hidden="true"></div>
        <header class="anime-card__name" :class="{ 'anime-card__name--small': isLongName }">
            <div class="anime-card__name-text">{{ appearance.name }}</div>
        </header>
        <div class="anime-card__body">
            <img
                class="anime-card__img"
                :src="imgSrc"
                :alt="appearance.name"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="onImgError"
            >
            <pre class="anime-card__text">{{ infoText }}</pre>
        </div>
        <footer class="anime-card__footer">
            <span class="anime-card__status-badge">{{ statusLabel }}</span>
            <span v-if="rank !== null" class="anime-card__rank">名次 {{ rank }}</span>
            <button
                type="button"
                class="anime-card__rank-btn"
                :aria-label="`設定「${appearance.name}」的名次`"
                aria-haspopup="dialog"
                @click.stop="openEditor"
                @keydown.enter.stop
                @keydown.space.stop
                @contextmenu.stop.prevent
            >排名</button>
        </footer>
        <div
            v-if="editorOpen"
            class="anime-card__rank-editor"
            role="dialog"
            :aria-label="`「${appearance.name}」名次設定`"
            @click.stop
            @keydown.stop
            @contextmenu.stop.prevent
        >
            <label class="anime-card__rank-label">
                名次
                <input
                    ref="rankInput"
                    v-model="rankDraft"
                    type="text"
                    class="form-control form-control-sm"
                    @keydown.enter.prevent="confirmRank"
                    @keydown.esc.prevent="closeEditor"
                >
            </label>
            <div class="anime-card__rank-actions">
                <button type="button" class="btn btn-sm btn-primary" @click="confirmRank">確定</button>
                <button type="button" class="btn btn-sm btn-outline-danger" @click="clearRank">清除名次</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeEditor">取消</button>
            </div>
        </div>
    </article>
</template>
<script>
import { STATUS_LABELS } from '../domain/snapshot'
import { cardText } from '../domain/anime'
import placeholderUrl from '../assets/placeholder.svg'

export default {
    props: {
        appearance: { type: Object, required: true },
        status: { type: String, required: true },
        rank: { type: String, default: null },
    },
    emits: ['cycle', 'set-rank', 'clear-rank'],
    data() {
        return {
            editorOpen: false,
            rankDraft: '',
            imgFailed: false,
        }
    },
    computed: {
        statusLabel() {
            return STATUS_LABELS[this.status] || this.status
        },
        infoText() {
            return cardText(this.appearance)
        },
        imgSrc() {
            if (this.imgFailed || !this.appearance.imageUrl) return placeholderUrl
            return this.appearance.imageUrl
        },
        isLongName() {
            return this.appearance.name.length >= 12
        },
        ariaLabel() {
            const rankText = this.rank !== null ? `，名次 ${this.rank}` : ''
            return `${this.appearance.name}，狀態：${this.statusLabel}${rankText}。按 Enter 切換狀態`
        },
    },
    watch: {
        // 換季重用元件時重置圖片失敗旗標
        'appearance.imageUrl'() {
            this.imgFailed = false
        },
    },
    methods: {
        onImgError() {
            this.imgFailed = true
        },
        // 桌面右鍵：prompt 輸入空白並確認＝清除，取消＝保留原值（產品決策 3）
        promptRank() {
            const input = prompt(`請輸入「${this.appearance.name}」動畫名次（留空清除名次）`, this.rank ?? '')
            if (input === null) return
            if (input.trim() === '') {
                this.$emit('clear-rank')
            } else {
                this.$emit('set-rank', input.trim())
            }
        },
        openEditor() {
            this.editorOpen = true
            this.rankDraft = this.rank ?? ''
            this.$nextTick(() => {
                this.$refs.rankInput?.focus()
            })
        },
        closeEditor() {
            this.editorOpen = false
        },
        confirmRank() {
            const value = this.rankDraft.trim()
            if (value === '') {
                this.$emit('clear-rank')
            } else {
                this.$emit('set-rank', value)
            }
            this.editorOpen = false
        },
        clearRank() {
            this.$emit('clear-rank')
            this.editorOpen = false
        },
    },
}
</script>
<style scoped>
.anime-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    cursor: pointer;
    background: #fff;
    border: 3px solid transparent;
    outline-offset: 2px;
}

.anime-card:focus-visible {
    outline: 3px solid #0d6efd;
}

/* 狀態視覺（搭配文字 badge，不只靠顏色） */
.anime-card.is-planned { border-color: #0d6efd; }
.anime-card.is-watching { border-color: #fd7e14; }
.anime-card.is-completed { border-color: #198754; }
.anime-card.is-dropped { border-color: #6c757d; }

.anime-card__dim {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, .45);
    pointer-events: none;
    z-index: 1;
}

.anime-card__name {
    background: black;
    color: white;
    display: grid;
    justify-content: center;
    align-items: center;
    min-height: 50px;
    font-size: 1.25em;
}

.anime-card__name--small {
    font-size: 1em;
}

.anime-card__name-text {
    padding: 2px 8px;
    text-align: center;
    word-break: break-word;
}

.anime-card__body {
    display: flex;
    flex: 1;
}

.anime-card__img {
    width: 50%;
    height: 200px;
    object-fit: cover;
    flex: 1;
    min-width: 0;
}

.anime-card__text {
    flex: 1;
    width: 50%;
    min-width: 0;
    background-color: rgb(232, 232, 232);
    white-space: pre-line;
    padding: 5px;
    word-break: break-all;
    color: black;
    font-size: 13px;
    height: 200px;
    overflow: hidden;
    margin: 0;
}

.anime-card__footer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    background: #f8f9fa;
    position: relative;
    z-index: 2;
}

.anime-card__status-badge {
    font-size: .8rem;
    font-weight: bold;
    padding: 1px 8px;
    border-radius: 10px;
    background: #adb5bd;
    color: #fff;
}

.is-planned .anime-card__status-badge { background: #0d6efd; }
.is-watching .anime-card__status-badge { background: #fd7e14; }
.is-completed .anime-card__status-badge { background: #198754; }
.is-dropped .anime-card__status-badge { background: #6c757d; }

.anime-card__rank {
    font-size: .9rem;
    font-weight: bold;
    color: #d63384;
}

.anime-card__rank-btn {
    margin-left: auto;
    font-size: .8rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background: #fff;
    padding: 1px 8px;
}

.anime-card__rank-btn:hover,
.anime-card__rank-btn:focus-visible {
    background: #e9ecef;
}

.anime-card__rank-editor {
    position: absolute;
    right: 4px;
    bottom: 36px;
    z-index: 10;
    background: #fff;
    border: 1px solid #ced4da;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, .2);
    padding: 8px;
    cursor: auto;
    width: min(220px, 90%);
}

.anime-card__rank-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    white-space: nowrap;
    font-size: .875rem;
}

.anime-card__rank-actions {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}
</style>
