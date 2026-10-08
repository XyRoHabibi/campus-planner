import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": versi baru TIDAK mengambil alih diam-diam (bisa memutus unggahan yang berjalan);
      // pengguna diberi tahu dan memilih "Muat ulang" (prd.md §22: cegah versi lama terus dipakai).
      registerType: 'prompt',
      injectRegister: false, // pendaftaran dilakukan manual di src/lib/pwa/register.ts
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Campus Planner',
        short_name: 'Planner',
        description: 'Jadwal kuliah, tugas, tenggat, dan lampiran mahasiswa dalam satu aplikasi.',
        lang: 'id',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F7F8FA',
        theme_color: '#4F46E5',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Tugas', url: '/tasks', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Jadwal', url: '/schedule', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        // HANYA aset aplikasi hasil build (app shell + chunk) yang di-precache. Sengaja TIDAK ada runtimeCaching:
        // permintaan ke Supabase (data, Auth, Storage/lampiran) tidak pernah di-cache oleh service worker.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html', // deep link (/tasks, /calendar, …) tetap membuka aplikasi saat offline
      },
      devOptions: { enabled: false }, // service worker hanya pada build produksi agar tidak membingungkan saat development
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
