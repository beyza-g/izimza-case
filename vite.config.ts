import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@mock-data': fileURLToPath(new URL('./mock-data', import.meta.url)),
    },
  },
  server: {
    watch: {
      // json-server writes to mock-data/db.json on every mutation; without
      // this, Vite's HMR would reload any module that imports it (e.g.
      // TimestampView.vue) mid-request, wiping local component state.
      ignored: ['**/mock-data/**'],
    },
  },
})
