import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function pagesFallback(): Plugin {
  return {
    name: 'pages-fallback',
    apply: 'build',
    closeBundle() {
      const index = resolve('dist/index.html')
      copyFileSync(index, resolve('dist/404.html'))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), pagesFallback()],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    host: '127.0.0.1',
    port: 4317,
    strictPort: true,
  },
})
