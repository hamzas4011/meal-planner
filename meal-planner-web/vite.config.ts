import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward /api/* to the ASP.NET Core backend (http profile in launchSettings.json)
      '/api': {
        target: 'http://localhost:5234',
        changeOrigin: true,
      },
    },
  },
})
