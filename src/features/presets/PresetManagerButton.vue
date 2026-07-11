<template>
    <button type="button" class="btn btn-sm btn-outline-secondary" @click="open = true">
        設定
    </button>
    <div v-if="open" class="preset-backdrop" @click.self="open = false">
        <div class="preset-modal" role="dialog" aria-modal="true" aria-label="設定管理">
            <div class="preset-modal__header">
                <h5 class="mb-0">設定管理</h5>
                <button type="button" class="btn-close" aria-label="關閉" @click="open = false"></button>
            </div>
            <div class="preset-modal__body">
                <div v-if="presetState.storageError" class="alert alert-danger">{{ presetState.storageError }}</div>
                <div v-if="presetState.readOnly" class="alert alert-warning">設定目前為唯讀狀態，無法新增或修改。</div>
                <div v-if="feedback" class="alert py-2" :class="feedbackKind === 'ok' ? 'alert-success' : 'alert-danger'" role="status">
                    {{ feedback }}
                </div>
                <div v-if="presetState.notes.length" class="alert alert-info py-2">
                    <details>
                        <summary>設定資料遷移紀錄（{{ presetState.notes.length }} 則）</summary>
                        <ul class="mb-0 mt-2">
                            <li v-for="(note, i) in presetState.notes" :key="i">{{ note }}</li>
                        </ul>
                    </details>
                </div>

                <div class="d-flex gap-2 flex-wrap align-items-center mb-2">
                    <div class="flex-grow-1 d-flex gap-1">
                        <input
                            v-model.trim="searchText"
                            type="search"
                            class="form-control form-control-sm"
                            placeholder="快速搜尋"
                            aria-label="搜尋設定"
                        >
                        <button v-if="searchText" type="button" class="btn btn-sm btn-light" @click="searchText = ''">清空</button>
                    </div>
                    <FilePickerButton @file="onImportFile" />
                    <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        :disabled="!snapshotReady || presetState.readOnly"
                        @click="saveAs"
                    >另存設定</button>
                </div>
                <hr class="my-2">

                <p v-if="!filteredPresets.length" class="text-muted text-center my-3">
                    {{ presetState.presets.length ? '沒有符合搜尋的設定' : '尚未儲存任何設定' }}
                </p>
                <div v-for="preset in filteredPresets" :key="preset.id" class="preset-item">
                    <div class="preset-item__info">
                        <span class="preset-item__name">{{ preset.name }}</span>
                        <small class="text-muted">
                            {{ preset.snapshot.mode === 'season' ? '單季' : '跨季' }}｜{{ preset.snapshot.seasonIds.join('、') }}｜{{ preset.snapshot.entries.length }} 部
                        </small>
                    </div>
                    <div class="preset-item__actions">
                        <button type="button" class="btn btn-sm btn-info" @click="load(preset)">讀取</button>
                        <button type="button" class="btn btn-sm btn-secondary" :disabled="presetState.readOnly" @click="rename(preset)">改名</button>
                        <button type="button" class="btn btn-sm btn-success" :disabled="!snapshotReady || presetState.readOnly" @click="overwrite(preset)">覆蓋</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" @click="exportFile(preset)">匯出</button>
                        <button type="button" class="btn btn-sm btn-danger" :disabled="presetState.readOnly" @click="remove(preset)">刪除</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import FilePickerButton from './FilePickerButton.vue'
import { usePresets } from '../../stores/presets'
import { useSnapshotRestore } from '../sharing/useSnapshotRestore'
import { exportPresetFile, readPresetFile } from '../../services/fileTransfer'
import { cloneSnapshot } from '../../domain/preset'

export default {
    components: { FilePickerButton },
    props: {
        // 由頁面提供目前清單的 snapshot builder（頁面組合 use case）
        buildSnapshot: { type: Function, required: true },
        snapshotReady: { type: Boolean, default: false },
    },
    data() {
        return {
            open: false,
            searchText: '',
            feedback: '',
            feedbackKind: 'ok',
            feedbackTimer: null,
        }
    },
    computed: {
        filteredPresets() {
            if (!this.searchText) return this.presetState.presets
            return this.presetState.presets.filter((p) => p.name.includes(this.searchText))
        },
    },
    setup() {
        const presetsStore = usePresets()
        const { restoreSnapshot } = useSnapshotRestore()
        return { presetsStore, presetState: presetsStore.state, restoreSnapshot }
    },
    beforeUnmount() {
        clearTimeout(this.feedbackTimer)
    },
    methods: {
        showFeedback(text, kind = 'ok') {
            this.feedback = text
            this.feedbackKind = kind
            clearTimeout(this.feedbackTimer)
            this.feedbackTimer = setTimeout(() => { this.feedback = '' }, 5000)
        },
        saveAs() {
            const name = prompt('新增設定名稱')
            if (name === null) return
            try {
                const preset = this.presetsStore.saveAs(name, this.buildSnapshot())
                this.showFeedback(`已另存設定「${preset.name}」`)
            } catch (e) {
                this.showFeedback(e instanceof Error ? e.message : String(e), 'err')
            }
        },
        rename(preset) {
            const name = prompt('修改設定名稱', preset.name)
            if (name === null) return
            try {
                this.presetsStore.rename(preset.id, name)
                this.showFeedback('已更新設定名稱')
            } catch (e) {
                this.showFeedback(e instanceof Error ? e.message : String(e), 'err')
            }
        },
        overwrite(preset) {
            if (!confirm(`確定要以目前清單覆蓋設定「${preset.name}」嗎？`)) return
            try {
                this.presetsStore.overwrite(preset.id, this.buildSnapshot())
                this.showFeedback(`已覆蓋設定「${preset.name}」`)
            } catch (e) {
                this.showFeedback(e instanceof Error ? e.message : String(e), 'err')
            }
        },
        remove(preset) {
            if (!confirm(`確定要刪除設定「${preset.name}」嗎？此動作無法復原。`)) return
            try {
                this.presetsStore.remove(preset.id)
                this.showFeedback(`已刪除設定「${preset.name}」`)
            } catch (e) {
                this.showFeedback(e instanceof Error ? e.message : String(e), 'err')
            }
        },
        exportFile(preset) {
            exportPresetFile(preset)
        },
        async onImportFile(file) {
            try {
                const { preset, notes } = await readPresetFile(file)
                const imported = this.presetsStore.importPreset(preset)
                const noteText = notes.length ? `（${notes.join('；')}）` : ''
                this.showFeedback(`已匯入設定「${imported.name}」${noteText}`)
            } catch (e) {
                this.showFeedback(`匯入失敗：${e instanceof Error ? e.message : String(e)}`, 'err')
            }
        },
        async load(preset) {
            try {
                const snapshot = cloneSnapshot(preset.snapshot)
                // 單季設定綁定原季度；跨季設定綁定其比較的兩季（FR-06.9）
                const path = snapshot.mode === 'season'
                    ? `/season/${snapshot.seasonIds[0]}`
                    : '/cross-season'
                await this.$router.push({ path, query: {} })
                const { missing } = await this.restoreSnapshot(snapshot)
                this.open = false
                if (missing.length) {
                    alert(`已讀取設定「${preset.name}」，但有 ${missing.length} 部動畫在目前資料找不到：\n${missing.join('、')}`)
                }
            } catch (e) {
                this.showFeedback(`讀取設定失敗：${e instanceof Error ? e.message : String(e)}`, 'err')
            }
        },
    },
}
</script>
<style scoped>
.preset-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .5);
    z-index: 1050;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 12px;
    overflow-y: auto;
}

.preset-modal {
    background: #fff;
    border-radius: 8px;
    width: min(720px, 100%);
    max-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, .3);
}

.preset-modal__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #dee2e6;
}

.preset-modal__body {
    padding: 12px 16px;
    overflow-y: auto;
}

.preset-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px 4px;
    border-bottom: 1px solid #f1f3f5;
}

.preset-item:hover {
    background: #f8f9fa;
}

.preset-item__info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.preset-item__name {
    font-weight: 600;
    word-break: break-all;
}

.preset-item__actions {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}
</style>
