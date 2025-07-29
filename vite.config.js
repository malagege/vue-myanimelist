const { defineConfig, loadEnv } = require('vite')
const vue = require('@vitejs/plugin-vue')
const path = require('path')
const Icons = require('unplugin-icons/vite')



module.exports = defineConfig((mode) => {
  const env = loadEnv(mode.mode, process.cwd())
  console.log('VITE_BASE:', env.VITE_BASE)
  return {
    base: env.VITE_BASE || '/',
    plugins: [vue(), Icons()],
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src')
      }
    }
  }
})