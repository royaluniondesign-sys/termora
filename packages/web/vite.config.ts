import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Single source of truth for the version shown in the UI — read from the
// workspace root package.json at build time instead of a literal that
// silently drifts from what's actually installed.
const rootPkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf-8'),
)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: parseInt(process.env.WEB_PORT ?? '4031', 10),
    host: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.localhost.run', '.lhr.life', '.trycloudflare.com'],
    proxy: {
      '/ws': {
        target: 'ws://localhost:4030',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:4030',
      },
    },
  },
})
