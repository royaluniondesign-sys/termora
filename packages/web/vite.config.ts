import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
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
