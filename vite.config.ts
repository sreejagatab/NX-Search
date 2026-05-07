import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'https://neuronx.jagatab.uk',
        changeOrigin: true,
        secure: true,
        proxyTimeout: 120000,
        timeout: 120000,
      },
      '/v1': {
        target: 'https://neuronx.jagatab.uk',
        changeOrigin: true,
        secure: true,
        proxyTimeout: 120000,
        timeout: 120000,
      },
    },
  },
  preview: {
    port: 3002,
  },
})
