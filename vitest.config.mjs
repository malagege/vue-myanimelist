import { defineConfig } from 'vitest/config'

// 獨立於 vite.config.js（專案建置仍使用 Vite 2）；vitest 使用自帶的 vite 跑測試。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,mjs,ts}'],
    environment: 'node',
  },
})
