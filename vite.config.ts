/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tally',
        short_name: 'Tally',
        description: 'A minimal personal habit tracker.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell; Firestore handles its own offline data.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        // Firebase Auth's sign-in handler lives under /__/ and must never be served from cache.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Separate long-lived vendor chunks so app updates don't re-download Firebase/React.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](@firebase|firebase|re2js|idb)[\\/]/.test(id))
            return 'firebase';
          if (
            /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(
              id,
            )
          )
            return 'react';
          return 'vendor';
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
