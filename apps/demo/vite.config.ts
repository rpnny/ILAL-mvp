import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.DEMO_API_TARGET || 'https://ilal-mvp-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
