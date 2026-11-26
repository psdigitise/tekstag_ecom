/**
 * CartContext — client-side cart state with server-validated vouchers.
 *
 * Security changes from original:
 *  - Hardcoded VOUCHER_CODES lookup table removed. Vouchers are now validated
 *    against the backend via validateVoucher(), which enforces expiry, usage
 *    limits, and minimum order server-side.
 *  - The frontend still shows a discount preview for UX, but the definitive
 *    discount is always re-calculated by the server during order creation.
 *    A client that manipulates discountedSubtotal gains nothing because the
 *    server ignores the client's total_amount entirely.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { validateVoucher, fetchProducts } from '../api'
import { normalizeProduct, unavailableReason, toNumber } from '../utils/product'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [modalProduct, setModalProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState(null)
  const [voucherError, setVoucherError] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)

  const itemsRef = useRef(items)
  itemsRef.current = items

  /** Returns false (and adds nothing) when the product can't be bought. */
  const addToCart = (product, qty = 1) => {
    if (unavailableReason(product)) return false
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { product, qty: i.qty + qty } : i
        )
      }
      return [...prev, { product, qty }]
    })
    setModalProduct({ product, qty })
    setShowModal(true)
    return true
  }

  /**
   * Re-check every basket line against the database: refresh price and stock,
   * and mark lines that can no longer be bought (`item.issue`). Throws if the
   * check itself fails; order creation re-validates on the server regardless.
   */
  const refreshCart = useCallback(async () => {
    const ids = itemsRef.current.map(i => i.product.id)
    if (ids.length === 0) return
    const fresh = await fetchProducts({ ids: ids.join(',') })
    const byId = new Map(fresh.map(p => [p.id, normalizeProduct(p)]))
    setItems(prev => prev.map(item => {
      if (!ids.includes(item.product.id)) return item
      const product = byId.get(item.product.id)
      if (!product) return { ...item, issue: 'No longer available' }
      const oldPrice = toNumber(item.product.priceExVat)
      const priceChangedFrom = oldPrice !== null && oldPrice !== product.priceExVat
        ? oldPrice
        : item.priceChangedFrom
      return { product, qty: item.qty, issue: unavailableReason(product), priceChangedFrom }
    }))
  }, [])

  /** Mark lines the server rejected when placing an order. */
  const markUnavailable = (problems = []) => {
    const reasons = new Map(problems.map(p => [Number(p.productId), String(p.reason)]))
    setItems(prev => prev.map(i => reasons.has(i.product.id) ? { ...i, issue: reasons.get(i.product.id) } : i))
  }

  const hasUnavailableItems = items.some(i => i.issue)

  const removeFromCart = (productId) => {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }

  const updateQty = (productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return }
    setItems(prev =>
      prev.map(i => i.product.id === productId ? { ...i, qty } : i)
    )
  }

  const clearCart = () => {
    setItems([])
    setAppliedVoucher(null)
    setVoucherCode('')
    setVoucherError('')
  }

  const closeModal = () => setShowModal(false)

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0)
  const subtotal = items.reduce((sum, i) => {
    const price = parseFloat(i.product.priceExVat) || parseFloat(i.product.price) || 0
    return sum + price * i.qty
  }, 0)

  // Re-validate voucher whenever cart subtotal changes
  useEffect(() => {
    if (!appliedVoucher) return
    if (appliedVoucher.minOrder > 0 && subtotal < appliedVoucher.minOrder) {
      setAppliedVoucher(null)
      setVoucherError(
        `Minimum order of £${appliedVoucher.minOrder.toFixed(2)} excl. VAT required for ${appliedVoucher.code}.`
      )
    }
  }, [subtotal]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Validates the voucher code against the backend API.
   * The server checks: existence, is_active, expiry, usage limits, min_order.
   * The returned discount is a PREVIEW — the server recalculates on order creation.
   */
  const applyVoucher = async (code) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setVoucherError('Please enter a voucher code.')
      return false
    }

    setVoucherLoading(true)
    setVoucherError('')

    try {
      const result = await validateVoucher(trimmed, subtotal)

      if (!result.valid) {
        setVoucherError(result.error || 'Invalid voucher code.')
        setAppliedVoucher(null)
        return false
      }

      setAppliedVoucher({
        code: trimmed,
        type: result.type,
        value: parseFloat(result.value),
        discount: parseFloat(result.discount),
        freeDelivery: result.free_delivery,
        minOrder: 0, // server already validated minimum
      })
      setVoucherError('')
      return true
    } catch {
      setVoucherError('Unable to validate voucher. Please try again.')
      setAppliedVoucher(null)
      return false
    } finally {
      setVoucherLoading(false)
    }
  }

  const removeVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCode('')
    setVoucherError('')
  }

  // Use server-returned discount amount directly (it was calculated server-side)
  const discount = appliedVoucher ? (appliedVoucher.discount ?? 0) : 0
  const discountedSubtotal = Math.max(0, subtotal - discount)

  return (
    <CartContext.Provider value={{
      items, totalItems, subtotal, discountedSubtotal, discount,
      addToCart, removeFromCart, updateQty, clearCart,
      refreshCart, markUnavailable, hasUnavailableItems,
      modalProduct, showModal, closeModal,
      voucherCode, setVoucherCode,
      appliedVoucher, voucherError, voucherLoading,
      applyVoucher, removeVoucher,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
