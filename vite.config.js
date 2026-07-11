const { defineConfig, loadEnv } = require('vite')
const vue = require('@vitejs/plugin-vue')
const path = require('path')

module.exports = defineConfig((mode) => {
  const env = loadEnv(mode.mode, process.cwd())
  return {
    base: env.VITE_BASE || '/',
    // Vue 3.4+ esm-bundler 需要的編譯期 feature flags
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src')
      }
    }
  }
})
