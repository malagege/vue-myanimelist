const { defineConfig } = require('vite')
const vue = require('@vitejs/plugin-vue')
const path = require('path')
const Icons = require('unplugin-icons/vite')

module.exports = defineConfig({
  base: '.',
  plugins: [vue(), Icons()],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src')
    }
  }
})