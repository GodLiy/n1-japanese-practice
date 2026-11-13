import { createHash } from 'node:crypto'
import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function ortRuntimeManifest(): Plugin {
  return {
    name: 'ort-runtime-manifest',
    apply: 'build',
    closeBundle() {
      const assets = resolve('dist/assets')
      const name = readdirSync(assets).find((file) => file.startsWith('ort-wasm-') && file.endsWith('.wasm'))
      if (!name) throw new Error('missing onnx runtime')
      const bytes = readFileSync(resolve(assets, name))
      writeFileSync(resolve('dist/ort-runtime.json'), JSON.stringify({
        file: `assets/${name}`,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.byteLength,
      }))
    },
  }
}

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
  plugins: [react(), ortRuntimeManifest(), pagesFallback()],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    host: '127.0.0.1',
    port: 4317,
    strictPort: true,
  },
})
