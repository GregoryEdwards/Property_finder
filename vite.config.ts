import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // The map stack (maplibre + deck.gl) dwarfs everything else. Split it so
    // the React shell can paint before the heavy WebGL libs finish parsing.
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ['maplibre-gl', 'react-map-gl'],
          deckgl: [
            '@deck.gl/core',
            '@deck.gl/layers',
            '@deck.gl/geo-layers',
            '@deck.gl/react',
          ],
          charts: ['recharts'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
    // The index chunk carries the inlined seed JSON (~3 MB pre-min, ~700 KB
    // gzipped). Phase 2 moves the data to /api/v1 and shrinks this chunk.
    chunkSizeWarningLimit: 4000,
  },
})
