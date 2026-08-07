// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import AstroPWA from '@vite-pwa/astro'

export default defineConfig({
  site: 'https://brand.oriz.in',
  output: 'static',
  integrations: [
    react(),
    sitemap(),
    AstroPWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png', 'icons/*.svg', '.well-known/assetlinks.json'],
      manifest: {
        name: 'oriz Brand',
        short_name: 'Brand',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        lang: 'en',
        dir: 'ltr',
        description: 'Describe a brand, get a full identity: palette, font pairing, tagline, voice, logo-concept prompt. Export CSS/JSON tokens. 100% client-side.',
        categories: ['productivity'],
        background_color: '#f4f2ec',
        theme_color: '#ff5c38',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        screenshots: [
          { src: '/screenshots/desktop.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide', label: 'oriz Brand — desktop' },
          { src: '/screenshots/mobile.png', sizes: '390x844', type: 'image/png', label: 'oriz Brand — mobile' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
        navigateFallback: '/',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/([a-z0-9-]+\.)?pollinations\.ai\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ai-pollinations',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/([a-z0-9-]+\.)?g4f\.(dev|icu)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ai-g4f',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
