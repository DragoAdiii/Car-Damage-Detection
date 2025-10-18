// vite.config.js (CORRECTED for Flask API connection)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // CRITICAL: This sets up the proxy for your Flask API
    proxy: {
      // When React calls /api/predict_damage, Vite redirects it to:
      // http://127.0.0.1:5000/predict_damage
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})