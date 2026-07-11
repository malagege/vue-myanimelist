<template>
    <label class="file-picker btn btn-sm btn-outline-secondary mb-0">
        <input type="file" accept=".json,application/json" @change="onChange">
        <slot>匯入檔案</slot>
    </label>
</template>
<script>
export default {
    emits: ['file'],
    methods: {
        onChange(event) {
            const file = event.target.files[0]
            if (file) this.$emit('file', file)
            // 允許重選同一檔案
            event.target.value = ''
        },
    },
}
</script>
<style scoped>
.file-picker input[type="file"] {
    display: none;
}
</style>
