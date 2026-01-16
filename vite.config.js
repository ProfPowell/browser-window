import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/browser-window.js',
      formats: ['es'],
      fileName: () => 'browser-window.js'
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
  server: {
    open: '/docs/index.html'
  }
})
