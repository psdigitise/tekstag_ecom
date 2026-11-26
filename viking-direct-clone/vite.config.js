import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // ── Development proxy ───────────────────────────────────────────────────────
  // Forwards /api requests to Django backend on the same origin so that
  // httpOnly cookies work without CORS (cookies are same-origin in this setup).
  // In production, nginx/reverse-proxy handles this routing.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ── Production build hardening ──────────────────────────────────────────────
  build: {
    // Remove all console.* and debugger statements from production bundles.
    // This prevents internal error details and token-related logs from being
    // visible to users who open DevTools in production.
    ...(mode === 'production' && {
      minify: 'esbuild',
    }),
  },

  esbuild: {
    // Drop console/debugger in production only
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
