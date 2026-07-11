const { defineConfig, loadEnv } = require('vite')
const vue = require('@vitejs/plugin-vue')
const path = require('path')

module.exports = defineConfig((mode) => {
  const env = loadEnv(mode.mode, process.cwd())
  return {
    base: env.VITE_BASE || '/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src')
      }
    }
  }
})
