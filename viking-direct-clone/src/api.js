/**
 * Centralised API client.
 *
 * Security properties:
 *  - All requests use credentials: 'include' so the httpOnly auth cookie
 *    is sent automatically — no token is ever stored in JavaScript.
 *  - The Authorization header is NEVER used; auth is cookie-only.
 *  - The backend address is set in backend.config.js (see utils/backend.js).
 *  - A shared apiFetch() wrapper centralises 401 handling and error parsing
 *    so individual callers don't need to repeat this logic.
 */

import { API_BASE, withBackendMedia, withoutBackendMedia } from './utils/backend'

/**
 * Base fetch wrapper.
 *  - Always sends credentials (httpOnly cookie)
 *  - Dispatches a custom 'auth:expired' event on 401 so AuthContext can
 *    clear its state without polling or duplicating logic
 *  - Returns the parsed JSON body or throws an error with a usable message
 */
// Number of requests in flight, for the progress bar.
let pending = 0
const networkListeners = new Set()
function trackRequest(delta) {
  pending += delta
  networkListeners.forEach(listener => listener(pending))
}
export function onNetworkChange(listener) {
  networkListeners.add(listener)
  listener(pending)
  return () => networkListeners.delete(listener)
}

async function apiFetch(path, options = {}) {
  trackRequest(1)
  try {
    return await request(path, options)
  } finally {
    trackRequest(-1)
  }
}

async function request(path, options) {
  const url = `${API_BASE}${path}`

  // Never set Content-Type for FormData — the browser must set it automatically
  // so it includes the multipart boundary. For everything else default to JSON.
  const isFormData = options.body instanceof FormData
  const config = {
    ...options,
    ...(options.body && { body: withoutBackendMedia(options.body) }),
    credentials: 'include', // sends httpOnly auth_token cookie
    headers: isFormData ? {} : {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  const res = await fetch(url, config)

  if (res.status === 401) {
    // Notify AuthContext to clear user state
    window.dispatchEvent(new CustomEvent('auth:expired'))
    const err = new Error('Session expired. Please sign in again.')
    err.status = 401
    throw err
  }

  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`
    try {
      const body = await res.json()
      errMsg = body.error || body.detail || JSON.stringify(body)
    } catch {
      // body was not JSON — keep the status-based message
    }
    const err = new Error(errMsg)
    // Callers branch on the HTTP status (e.g. 404 = not found), never on message text.
    err.status = res.status
    throw err
  }

  // 204 No Content — return null instead of trying to parse an empty body
  if (res.status === 204) return null

  return withBackendMedia(await res.json())
}

// ── Products ──────────────────────────────────────────────────────────────────

/** Build "?a=1&b=2&b=3"; empty values are skipped and arrays repeat the key. */
function toQuery(options) {
  const params = new URLSearchParams()
  Object.entries(options).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value]
    values.forEach(v => {
      if (v !== undefined && v !== null && v !== '') params.append(key, v)
    })
  })
  return params.toString() ? `?${params}` : ''
}

/**
 * List products.
 *
 * Without `page` the result is an array. With `page` it is
 * { count, page, pageSize, totalPages, results }.
 *
 * Options (all optional): section, category (id), slug (category slug), search,
 * brand, exclude (product id), ids, categories[], brands[], price[], eco,
 * bestprice, available, grouped (1 = one entry per product, sizes combined), ordering (newest|popular|price_asc|price_desc|name),
 * limit (max 100), page, page_size (max 100).
 */
export async function fetchProducts(options = {}) {
  const path = `/products/${toQuery(options)}`
  const data = await apiFetch(path, { credentials: 'omit' }) // public endpoint
  remember(responses, path, data)
  const list = Array.isArray(data) ? data : data.results
  list.forEach(p => remember(products, p.id, p))
  return data
}

// Last answers seen, so a page can appear instantly and then refresh itself.
const responses = new Map()
const products = new Map()
function remember(cache, key, value) {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size > 300) cache.delete(cache.keys().next().value)
}
export const peekProducts = (options = {}) => responses.get(`/products/${toQuery(options)}`)
export const peekFacets = (scope = {}) => responses.get(`/products/facets/${toQuery(scope)}`)
export const peekProduct = id => products.get(Number(id))

/** Filter options + counts for a whole listing (section, slug, search, brand). */
export async function fetchProductFacets(scope = {}) {
  const path = `/products/facets/${toQuery(scope)}`
  const data = await apiFetch(path, { credentials: 'omit' })
  remember(responses, path, data)
  return data
}

/** One product by id. Throws an error with `status === 404` when it doesn't exist. */
export async function fetchProduct(id) {
  const data = await apiFetch(`/products/${encodeURIComponent(id)}/`, { credentials: 'omit' })
  remember(products, data.id, data)
  return data
}

export async function fetchCategories() {
  return apiFetch('/categories/', { credentials: 'omit' })
}

export async function fetchBrands() {
  return apiFetch('/brands/', { credentials: 'omit' })
}

export async function fetchReviews() {
  return apiFetch('/reviews/', { credentials: 'omit' })
}

export async function fetchProductReviews(productId) {
  return apiFetch(`/reviews/?product=${productId}`, { credentials: 'omit' })
}

export async function submitProductReview(reviewData) {
  // No token argument — cookie auth is automatic
  return apiFetch('/reviews/', {
    method: 'POST',
    body: JSON.stringify(reviewData),
  })
}

export async function checkCanReview(productId) {
  return apiFetch(`/reviews/can_review/?product=${productId}`)
}

/** Upload an admin content picture; returns { url }. */
export async function uploadImage(file) {
  const form = new FormData()
  form.append('image', file)
  return apiFetch('/uploads/', { method: 'POST', body: form })
}

// ── Product photo gallery ────────────────────────────────────────────────────

export async function fetchProductImages(productId) {
  return apiFetch(`/products/${productId}/images/`)
}

export async function uploadProductImages(productId, files) {
  const form = new FormData()
  files.forEach(file => form.append('images', file))
  return apiFetch(`/products/${productId}/images/`, { method: 'POST', body: form })
}

export async function deleteProductImage(imageId) {
  return apiFetch(`/product-images/${imageId}/`, { method: 'DELETE' })
}

export async function makeMainImage(imageId) {
  return apiFetch(`/product-images/${imageId}/make_main/`, { method: 'POST' })
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function registerUser(userData) {
  return apiFetch('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

export async function loginUser(email, password) {
  return apiFetch('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logoutUser() {
  return apiFetch('/auth/logout/', { method: 'POST' })
}

export async function getMe() {
  // No token argument — cookie auth is automatic
  return apiFetch('/auth/me/')
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function fetchStats() {
  return apiFetch('/stats/')
}

export async function createProduct(productData) {
  const isFormData = productData instanceof FormData
  return apiFetch('/products/', {
    method: 'POST',
    // Let the browser set Content-Type for FormData (includes boundary)
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? productData : JSON.stringify(productData),
  })
}

export async function updateProduct(id, productData) {
  const isFormData = productData instanceof FormData
  return apiFetch(`/products/${id}/`, {
    method: 'PATCH',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? productData : JSON.stringify(productData),
  })
}

export async function deleteProduct(id) {
  return apiFetch(`/products/${id}/`, { method: 'DELETE' })
}

export async function createCategory(categoryData) {
  return apiFetch('/categories/', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  })
}

export async function updateCategory(id, categoryData) {
  return apiFetch(`/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(categoryData),
  })
}

export async function deleteCategory(id) {
  return apiFetch(`/categories/${id}/`, { method: 'DELETE' })
}

// ── Site Settings ─────────────────────────────────────────────────────────────

export async function fetchSettings() {
  return apiFetch('/settings/', { credentials: 'omit' })
}

export async function updateSetting(key, value) {
  try {
    return await apiFetch(`/settings/${key}/`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    })
  } catch (err) {
    // Key doesn't exist yet — create it. (Previously this matched the error
    // message text, which never matched Django's 404 message, so first-time
    // saves always failed.)
    if (err.status === 404) {
      return apiFetch('/settings/', {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      })
    }
    throw err
  }
}

// ── Vouchers (admin) ──────────────────────────────────────────────────────────

export async function fetchVouchers() {
  return apiFetch('/vouchers/')
}

/** Creates the voucher, or updates it when `id` is given. */
export async function saveVoucher(data, id) {
  return apiFetch(id ? `/vouchers/${id}/` : '/vouchers/', {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteVoucher(id) {
  return apiFetch(`/vouchers/${id}/`, { method: 'DELETE' })
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchUsers() {
  return apiFetch('/users/')
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function fetchAllOrders({ status = '', search = '' } = {}) {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (search) params.append('search', search)
  const query = params.toString() ? `?${params}` : ''
  return apiFetch(`/orders/${query}`)
}

export async function updateOrder(id, data) {
  return apiFetch(`/orders/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ── My Orders (customer) ──────────────────────────────────────────────────────

export async function fetchMyOrders() {
  return apiFetch('/orders/')
}

export async function fetchInvoiceBlob(orderId) {
  const url = `${API_BASE}/orders/${orderId}/invoice/`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to download invoice')
  return res.blob()
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export async function fetchAddresses() {
  return apiFetch('/addresses/')
}

export async function createAddress(data) {
  return apiFetch('/addresses/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateAddress(id, data) {
  return apiFetch(`/addresses/${id}/`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteAddress(id) {
  return apiFetch(`/addresses/${id}/`, { method: 'DELETE' })
}

export async function setDefaultAddress(id) {
  return apiFetch(`/addresses/${id}/set_default/`, { method: 'POST' })
}

// ── Payment methods ───────────────────────────────────────────────────────────

export async function fetchPaymentMethods() {
  return apiFetch('/payment-methods/')
}

export async function createPaymentMethod(data) {
  return apiFetch('/payment-methods/', { method: 'POST', body: JSON.stringify(data) })
}

export async function deletePaymentMethod(id) {
  return apiFetch(`/payment-methods/${id}/`, { method: 'DELETE' })
}

export async function setDefaultPaymentMethod(id) {
  return apiFetch(`/payment-methods/${id}/set_default/`, { method: 'POST' })
}

// ── Shopping lists (account page) ────────────────────────────────────────────

export async function fetchShoppingLists() {
  return apiFetch('/shopping-lists/')
}

export async function createShoppingList(name) {
  return apiFetch('/shopping-lists/', { method: 'POST', body: JSON.stringify({ name }) })
}

// ── Vouchers ──────────────────────────────────────────────────────────────────

export async function validateVoucher(code, subtotal) {
  return apiFetch('/vouchers/validate/', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal }),
  })
}
