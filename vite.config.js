const { defineConfig, loadEnv } = require('vite')
const vue = require('@vitejs/plugin-vue')
const path = require('path')
const Icons = require('unplugin-icons/vite')



module.exports = defineConfig((mode) => ({
  base: loadEnv(mode, process.cwd()).VITE_BASE,
  plugins: [vue(), Icons()],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src')
    }
  }
}))