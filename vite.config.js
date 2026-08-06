import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'pwa_icon_192.png', 'pwa_icon_512.png', 'aflow-logo.png'],
      workbox: {
        cacheId: 'arestv-v1',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      manifest: {
        name: 'A Flow',
        short_name: 'AFlow',
        description: 'App moderne për menaxhimin e financave dhe faturave',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'sq',
        categories: ['finance', 'business', 'productivity'],
        icons: [
          { src: 'pwa_icon_192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa_icon_512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          lucide: ['lucide-react'],
        }
      }
    }
  }
})
