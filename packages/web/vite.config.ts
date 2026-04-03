import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4031,
    host: true, // bind to 0.0.0.0 so phones on the same Wi-Fi can connect
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.localhost.run', '.lhr.life'],
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
