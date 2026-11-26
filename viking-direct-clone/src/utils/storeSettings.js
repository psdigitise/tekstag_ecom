/**
 * Store-wide values the admin controls (Admin → Store Settings).
 *
 * Each group is one site setting. The defaults apply until the admin saves it.
 * A text the admin clears is hidden on the website.
 *
 * Pricing and invoice defaults are mirrored in store/store_settings.py.
 */
export const PRICING_DEFAULTS = {
  vatRate: 20,
  deliveryCharge: 2.46,
  freeDeliveryOver: 29,
}

export const TEXT_DEFAULTS = {
  storeName: 'tekstag',
  logo: '',
  browserTitle: 'Tekstag – Premium Office Solutions',
  showTopBar: true,
  topBarText: 'Prices excl. VAT',
  footerHeadline: 'Find the right packaging for your business',
  footerSubtext: 'Browse the full range and choose the size you need.',
  footerButton: 'Browse all products',
  footerButtonLink: '/category',
  footerPriceNote: 'Prices shown excl. VAT',
  copyright: 'Tekstag. All rights reserved',
}

export const HEADING_DEFAULTS = {
  categories: 'SHOP BY CATEGORY',
  productTypes: 'SHOP BY PRODUCT TYPE',
  range: 'EXPLORE OUR RANGE',
  brands: 'MOST POPULAR BRANDS',
  viewed: 'Customers with similar interests also viewed',
  bought: 'People Who Viewed Items You Browsed Ultimately Bought',
  recommendation: 'Recommended for you',
  newest: 'New Arrivals',
}

export const INVOICE_DEFAULTS = {
  title: 'TAX INVOICE',
  businessName: 'tekstag',
  tagline: 'Business Supplies & Solutions',
  address: '',
  phone: '',
  email: '',
  vatNumber: '',
  footer: 'Thank you for choosing tekstag.',
}

const merged = (saved, defaults) => ({ ...defaults, ...(saved || {}) })

export const getStoreText = settings => merged(settings?.store_text, TEXT_DEFAULTS)
export const getHeadings = settings => merged(settings?.headings, HEADING_DEFAULTS)

export function getPricing(settings) {
  const saved = merged(settings?.pricing, PRICING_DEFAULTS)
  const number = (value, fallback) => {
    const n = Number(value)
    return value !== '' && value !== null && Number.isFinite(n) && n >= 0 ? n : fallback
  }
  return {
    vatRate: number(saved.vatRate, PRICING_DEFAULTS.vatRate),
    deliveryCharge: number(saved.deliveryCharge, PRICING_DEFAULTS.deliveryCharge),
    // null = delivery is never free (except with a free delivery voucher).
    freeDeliveryOver: number(saved.freeDeliveryOver, null),
  }
}

/** Basket totals. `goods` is the amount excl. VAT after any voucher discount. */
export function basketTotals(goods, pricing, voucherFreeDelivery = false) {
  const { vatRate, deliveryCharge, freeDeliveryOver } = pricing
  const free = voucherFreeDelivery || (freeDeliveryOver !== null && goods >= freeDeliveryOver)
  const delivery = free ? 0 : deliveryCharge
  const vat = goods * vatRate / 100
  return { delivery, vat, total: goods + delivery + vat }
}
