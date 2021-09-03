import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname,join,resolve } from 'path'
import Icons from 'unplugin-icons/vite'
import { loadEnv } from 'vite'
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)


// 設定 Vite 環境變數方法
// https://www.jianshu.com/p/4973bd983e96
export default ({ mode }) => {
  return defineConfig({
    base:loadEnv(mode, process.cwd()).VITE_BASE,
    plugins: [vue(),Icons({ /* options */ }),],
    resolve: {
      alias: {
        '@': `${join(__dirname, 'src')}`
      }
    }
  })
}
