import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname,join,resolve } from 'path'
import Icons from 'unplugin-icons/vite'
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(),Icons({ /* options */ }),],
  resolve: {
    alias: {
      '@': `${join(__dirname, 'src')}`
    }
  }
})
