import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { BACKEND_URL } from './backend.config.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The dev server forwards to the address in backend.config.js. To use another
  // one (for example a local Django), set BACKEND_URL in .env.
  const proxy = { target: env.BACKEND_URL || BACKEND_URL, changeOrigin: true, secure: false }
  // The built website calls this address, so the security policy must allow it.
  const allowed = env.VITE_BACKEND_URL || BACKEND_URL

  return {
    plugins: [
      react(),
      { name: 'backend-url', transformIndexHtml: html => html.replaceAll('%BACKEND_URL%', allowed) },
    ],

    // ── Development server ──────────────────────────────────────────────────
    // Forwards /api and /media to the Django backend, so the browser sees one
    // origin and httpOnly cookies work without CORS.
    // In production, nginx/reverse-proxy handles this routing.
    server: {
      host: '0.0.0.0',   // listen on all interfaces (LAN / Docker access)
      port: 5173,
      proxy: {
        '/api': proxy,
        '/media': proxy,
      },
    },

    // ── Production build hardening ──────────────────────────────────────────
    build: {
      ...(mode === 'production' && {
        minify: 'esbuild',
      }),
    },

    esbuild: {
      // Drop console/debugger in production only
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  }
})
