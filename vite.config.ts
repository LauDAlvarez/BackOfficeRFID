import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import { parseEnv } from './src/lib/env-schema.ts'

export default defineConfig(({ mode }) => {
  // Fallar al iniciar o compilar, antes de entregar un bundle mal configurado.
  parseEnv({ ...loadEnv(mode, process.cwd(), 'VITE_'), MODE: mode })
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      clearMocks: true,
      restoreMocks: true,
      unstubEnvs: true,
      css: false,
    },
  }
})
