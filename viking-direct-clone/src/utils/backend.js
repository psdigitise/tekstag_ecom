import { BACKEND_URL } from '../../backend.config'

/**
 * Where the backend is.
 *  - Built website: calls BACKEND_URL (backend.config.js) directly.
 *  - Development: the dev server forwards /api and /media to the same address,
 *    so signing in keeps working from localhost.
 */
export const BACKEND_ORIGIN = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_URL || BACKEND_URL)
export const API_BASE = `${BACKEND_ORIGIN}/api`

/** Picture paths in API responses ("/media/…") become full backend addresses. */
export function withBackendMedia(data) {
  if (!BACKEND_ORIGIN) return data
  if (typeof data === 'string') return data.startsWith('/media/') ? BACKEND_ORIGIN + data : data
  if (Array.isArray(data)) return data.map(withBackendMedia)
  if (data && typeof data === 'object') {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, withBackendMedia(value)]))
  }
  return data
}

/** The reverse, before saving: the database keeps "/media/…" paths. */
export function withoutBackendMedia(body) {
  if (!BACKEND_ORIGIN || !body) return body
  const strip = text => text.split(`${BACKEND_ORIGIN}/media/`).join('/media/')
  if (typeof body === 'string') return strip(body)
  if (body instanceof FormData) {
    const form = new FormData()
    for (const [key, value] of body.entries()) form.append(key, typeof value === 'string' ? strip(value) : value)
    return form
  }
  return body
}
