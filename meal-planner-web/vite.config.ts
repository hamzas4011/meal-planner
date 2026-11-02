import { defineConfig } from 'vite'

export default defineConfig({
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
