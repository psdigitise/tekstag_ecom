/**
 * Helpers for displaying real product data from the API.
 *
 * Rule: never invent values. If a field is missing, these return null so the
 * UI can hide that part instead of showing a made-up number.
 */

/** Parse a price/number from the API (decimals arrive as strings). null if not a number. */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Unit price: "£12.50", or up to 4 decimals when needed ("£0.026", "£0.0035").
 * null when there is no valid price. Basket and order totals use toFixed(2).
 */
export function formatPrice(value) {
  const n = toNumber(value)
  return n === null ? null : `£${n.toFixed(4).replace(/(\.\d{2}\d*?)0+$/, '$1')}`
}

/** "Category › Subcategory" label for a category from the API list. */
export function categoryLabel(category, all) {
  const parent = category.parent && all.find(c => c.id === category.parent)
  return parent ? `${parent.name} › ${category.name}` : category.name
}

/** Best available image URL: uploaded file first, then the image URL. null if none. */
export function getProductImage(product) {
  return product?.imageUrl || product?.image_file || product?.image || null
}

/** Display text for a product badge. Accepts both admin values and the client template values. */
const BADGE_LABELS = {
  'Buy More, Save More': 'Buy More, Save More',
  buyMore: 'Buy More, Save More',
  promo: 'Promo price',
  sale: 'Sale',
  new: 'New',
}

export function isBuyMore(product) {
  return product?.badge === 'Buy More, Save More' || product?.badge === 'buyMore'
}

export function badgeLabel(badge) {
  if (!badge) return null
  return BADGE_LABELS[badge] || badge
}

// Same pattern as the server (store/availability.py).
export function isOutOfStock(product) {
  return /^\s*out[\s_-]*of[\s_-]*stock\s*$/i.test(product?.stockStatus || '')
}

/**
 * Why a product can't be bought, or null. The API's verdict wins; the server
 * checks again when the order is placed.
 */
export function unavailableReason(product) {
  if (!product) return 'No longer available'
  if (product.isPurchasable === false) return product.unavailableReason || 'Unavailable'
  if (isOutOfStock(product)) return 'Out of stock'
  const price = toNumber(product.priceExVat)
  return price === null || price <= 0 ? 'Price not available' : null
}

export function isPurchasable(product) {
  return unavailableReason(product) === null
}

/** Rating to show, or null when the product has no rating data. */
export function getRating(product) {
  const stars = toNumber(product?.stars)
  const count = toNumber(product?.reviewCount) || 0
  if (!stars || stars <= 0) return null
  return { stars, count }
}

/** Normalise an API product so number fields are numbers (or null). */
export function normalizeProduct(p) {
  return {
    ...p,
    priceExVat: toNumber(p.priceExVat),
    priceIncVat: toNumber(p.priceIncVat),
    stars: toNumber(p.stars),
    reviewCount: toNumber(p.reviewCount) || 0,
    priceTiers: (p.priceTiers || [])
      .map(t => ({ ...t, price: toNumber(t.price) }))
      .filter(t => t.qty && t.price !== null),
  }
}
