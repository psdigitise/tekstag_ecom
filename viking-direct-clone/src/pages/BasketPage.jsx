import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { ShoppingCart, X, Check, Tag, AlertCircle } from 'lucide-react'
import { fetchProducts } from '../api'
import { getRecentlyViewed } from '../utils/storage'
import { formatPrice, isOutOfStock, isBuyMore, getProductImage, unavailableReason } from '../utils/product'
import ProductImage from '../components/ProductImage'
import { Spinner } from '../components/Loaders'
import { useSiteSettings } from '../context/SettingsContext'
import { getPricing, basketTotals } from '../utils/storeSettings'

export default function BasketPage() {
  const {
    items, totalItems, subtotal, discountedSubtotal, discount,
    removeFromCart, updateQty, clearCart, addToCart,
    voucherCode, setVoucherCode, appliedVoucher, voucherError,
    applyVoucher, removeVoucher, voucherLoading,
    refreshCart, hasUnavailableItems,
  } = useCart()
  // 'checking' | 'done' | 'failed' — the price/stock re-check on page open.
  const [check, setCheck] = useState('checking')

  const runCheck = () => {
    setCheck('checking')
    refreshCart().then(() => setCheck('done')).catch(() => setCheck('failed'))
  }
  useEffect(runCheck, [refreshCart])
  // VAT rate and delivery charges: Admin → Store Settings.
  const { settings, loading: settingsLoading, loadError: settingsError, refreshSettings } = useSiteSettings()
  const chargesReady = !settingsLoading && !settingsError
  const checkoutBlocked = hasUnavailableItems || check === 'checking' || !chargesReady
  // Pick up charges the admin changed since the site was opened.
  useEffect(() => { refreshSettings() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [suggestions, setSuggestions] = useState([])
  const [topSelling, setTopSelling] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [showVoucherInput, setShowVoucherInput] = useState(false)

  const hasFreeDelivery = appliedVoucher?.freeDelivery || false
  const pricing = getPricing(settings)
  const { delivery: deliveryCost, vat, total } = basketTotals(discountedSubtotal, pricing, hasFreeDelivery)
  const money = amount => chargesReady ? `£${amount.toFixed(2)}` : '—'

  useEffect(() => {
    // Suggestions come from the admin-curated display sections.
    Promise.all([
      fetchProducts({ section: 'viewed', limit: 4 }),
      fetchProducts({ section: 'bought', limit: 4 }),
    ]).then(([viewed, bought]) => {
      setSuggestions(viewed)
      setTopSelling(bought)
    }).catch(console.error)
    // "Recently viewed" is the shopper's real browsing history (it used to show
    // arbitrary listing products under this heading).
    setRecentlyViewed(getRecentlyViewed().slice(0, 4))
  }, [])

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-12">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 py-3">
          <nav className="text-[12px] text-gray-500">
            <Link to="/home" className="hover:underline">Home</Link>
            <span className="mx-1.5">›</span>
            <span className="text-gray-900">Basket</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 pt-6">
        {/* Title */}
        <h1 className="text-[26px] font-bold text-gray-900 mb-4">
          My basket <span className="text-[18px] text-gray-500 font-normal">({totalItems} items)</span>
        </h1>

        {items.length > 0 && hasUnavailableItems && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 mb-5 flex items-center gap-2.5 text-[13px] text-red-700">
            <AlertCircle size={18} className="flex-shrink-0" />
            Some items can't be ordered. Remove them to continue to checkout.
          </div>
        )}
        {items.length > 0 && check === 'failed' && (
          <div role="alert" className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 mb-5 flex items-center gap-2.5 text-[13px] text-amber-800">
            <AlertCircle size={18} className="flex-shrink-0" />
            We couldn't re-check prices and stock. They will be checked again when you place the order.
            <button onClick={runCheck} className="font-bold underline ml-1">Try again</button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-sm p-12 text-center">
            <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-[20px] font-bold text-gray-700 mb-2">Your basket is empty</h2>
            <p className="text-[14px] text-gray-500 mb-6">Add products to your basket to see them here.</p>
            <Link
              to="/category"
              className="inline-block bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[14px] px-6 py-2.5 rounded-[2px] transition-colors"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="flex gap-6 items-start">
            {/* Left: Cart Items */}
            <div className="flex-1">
              {/* Cart Items */}
              <div className="bg-white rounded-sm">
                {items.map((item, idx) => {
                  const price = parseFloat(item.product.priceExVat) || parseFloat(item.product.price) || 0

                  return (
                    <div key={item.product.id} className={`p-5 ${idx > 0 ? 'border-t border-gray-200' : ''}`}>
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                          <ProductImage
                            src={getProductImage(item.product)}
                            alt={item.product.name}
                            className="w-[90px] h-[90px] object-contain"
                            placeholderClassName="w-[90px] h-[90px]"
                            iconSize={22}
                          />
                        </Link>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          {/* Badges */}
                          {item.product.ecoBadge && (
                            <div className="mb-1">
                              <span className="inline-block bg-[#6EAA3C] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
                                {item.product.ecoBadge}
                              </span>
                            </div>
                          )}

                          <div className="flex items-start justify-between">
                            <div className="flex-1 mr-4">
                              {isBuyMore(item.product) && (
                                <p className="text-[12px] font-bold mb-0.5">
                                  Buy More, <span className="text-[#D52B1E]">Save More</span>
                                </p>
                              )}
                              {item.issue && (
                                <p className="text-[12px] font-bold text-[#D52B1E] mb-1">
                                  Can't be ordered: {item.issue}
                                </p>
                              )}
                              {!item.issue && item.priceChangedFrom !== undefined && (
                                <p className="text-[12px] text-amber-700 mb-1">
                                  Price updated (was {formatPrice(item.priceChangedFrom)})
                                </p>
                              )}

                              <Link to={`/product/${item.product.id}`} className="text-[14px] font-bold text-gray-800 hover:text-[#0066CC] hover:underline leading-snug block mb-1">
                                {item.product.name}
                              </Link>
                              {item.product.size && (
                                <p className="text-[12px] font-semibold text-gray-700 mb-0.5">Size: {item.product.size}</p>
                              )}
                              {item.product.sku && (
                                <p className="text-[12px] text-gray-500 mb-2">
                                  SKU {item.product.sku}
                                </p>
                              )}

                              {/* Stock Status */}
                              {item.product.stockStatus && (
                                <p className={`text-[12px] mb-2 ${isOutOfStock(item.product) ? 'text-[#D52B1E]' : 'text-[#00857C]'}`}>
                                  <span className="font-bold flex items-center gap-1">
                                    {isOutOfStock(item.product) ? <X size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
                                    {item.product.stockStatus}
                                  </span>
                                  {item.product.deliveryText && (
                                    <span className="text-gray-500">{item.product.deliveryText}</span>
                                  )}
                                </p>
                              )}

                            </div>

                            {/* Price + Remove */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-[20px] font-black text-gray-900">
                                £{(price * item.qty).toFixed(2)}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {formatPrice(price)} Each
                              </p>
                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-[13px] text-[#D52B1E] hover:underline mt-2 font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Quantity Selector */}
                          <div className="flex items-center gap-2 mt-3">
                            <label className="text-[12px] text-gray-500">Qty:</label>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateQty(item.product.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-[50px] h-8 border border-gray-300 rounded-[2px] text-center text-[14px] font-semibold outline-none focus:border-[#0066CC]"
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Save / Empty basket links */}
              <div className="flex items-center gap-4 mt-4 mb-8">
                <button
                  onClick={clearCart}
                  className="text-[13px] text-[#0066CC] hover:underline font-medium"
                >
                  Empty basket
                </button>
              </div>

              {/* Don't forget to buy */}
              {suggestions.length > 0 && (
                <div className="bg-white rounded-sm p-5 mb-6 soft-in">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-[16px] font-bold text-gray-800 whitespace-nowrap">Don't forget to buy...</h3>
                    <div className="flex-1 h-[1px] bg-gray-200"></div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {suggestions.map(s => {
                      const sp = parseFloat(s.priceExVat) || 0
                      return (
                        <div key={s.id} className="text-center">
                          <Link to={`/product/${s.id}`}>
                            <div className="h-[100px] flex items-center justify-center mb-2">
                              <img src={s.imageUrl || s.image_file || s.image} alt={s.name} className="max-h-full max-w-full object-contain hover:scale-105 transition-transform" onError={(e) => { e.target.style.display = 'none' }} />
                            </div>
                            <p className="text-[12px] text-gray-700 line-clamp-2 hover:text-[#0066CC] mb-1.5 leading-snug">{s.name}</p>
                          </Link>
                          <p className="text-[12px] text-gray-500">Only</p>
                          <p className="text-[18px] font-black text-gray-900">{formatPrice(sp)}</p>
                          <p className="text-[11px] text-gray-400 mb-2">
                            excl. VAT{formatPrice(s.priceIncVat) ? ` · ${formatPrice(s.priceIncVat)} incl. VAT` : ''}
                          </p>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => addToCart(s, 1)}
                              disabled={!!unavailableReason(s)}
                              className="bg-[#0066CC] hover:bg-[#0052A3] text-white text-[12px] font-bold px-3 py-1.5 rounded-[2px] flex items-center gap-1 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              <ShoppingCart size={13} />
                              Add to basket
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Top Selling Items */}
              {topSelling.length > 0 && (
                <div className="bg-white rounded-sm p-5 mb-6 soft-in">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-[16px] font-bold text-gray-800 whitespace-nowrap">Top selling items for you</h3>
                    <div className="flex-1 h-[1px] bg-gray-200"></div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {topSelling.map(s => {
                      const sp = parseFloat(s.priceExVat) || 0
                      return (
                        <div key={s.id}>
                          <Link to={`/product/${s.id}`}>
                            <div className="h-[120px] flex items-center justify-center mb-2">
                              <img src={s.imageUrl || s.image_file || s.image} alt={s.name} className="max-h-full max-w-full object-contain hover:scale-105 transition-transform" onError={(e) => { e.target.style.display = 'none' }} />
                            </div>
                            <p className="text-[12px] text-gray-700 line-clamp-2 hover:text-[#0066CC] mb-1 leading-snug">{s.name}</p>
                          </Link>
                          {s.badge === 'buyMore' && (
                            <p className="text-[11px] font-bold mb-0.5">Buy More, <span className="text-[#D52B1E]">Save More</span></p>
                          )}
                          {s.badge === 'promo' && (
                            <p className="text-[11px] font-bold text-[#D52B1E] mb-0.5">Promo Price</p>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-[18px] font-black text-gray-900">{formatPrice(sp)}</span>
                            {s.unit && <span className="text-[11px] text-gray-500">{s.unit}</span>}
                          </div>
                          <p className="text-[11px] text-gray-400 mb-2">
                            excl. VAT{formatPrice(s.priceIncVat) ? ` · ${formatPrice(s.priceIncVat)} incl. VAT` : ''}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => addToCart(s, 1)}
                              disabled={!!unavailableReason(s)}
                              className="bg-[#0066CC] hover:bg-[#0052A3] text-white text-[12px] font-bold px-3 py-1.5 rounded-[2px] flex items-center gap-1 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              <ShoppingCart size={13} /> {unavailableReason(s) || 'Add to basket'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recently viewed */}
              {recentlyViewed.length > 0 && (
                <div className="bg-white rounded-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-[16px] font-bold text-gray-800 whitespace-nowrap">Recently viewed products</h3>
                    <div className="flex-1 h-[1px] bg-gray-200"></div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {recentlyViewed.map(s => (
                      <Link key={s.id} to={`/product/${s.id}`}>
                        <div className="h-[100px] flex items-center justify-center mb-2">
                          <img src={s.imageUrl || s.image_file || s.image} alt={s.name} className="max-h-full max-w-full object-contain hover:scale-105 transition-transform" onError={(e) => { e.target.style.display = 'none' }} />
                        </div>
                        <p className="text-[12px] text-gray-700 line-clamp-2 hover:text-[#0066CC] leading-snug">{s.name}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar: Order Summary */}
            <div className="w-[300px] flex-shrink-0 hidden md:block sticky top-[80px]">
              <div className="bg-white rounded-sm p-5">
                {/* Voucher Code Section */}
                {appliedVoucher ? (
                  <div className="mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-sm px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-green-600" />
                        <div>
                          <p className="text-[13px] font-bold text-green-700">{appliedVoucher.code}</p>
                          <p className="text-[11px] text-green-600">{appliedVoucher.label}</p>
                        </div>
                      </div>
                      <button
                        onClick={removeVoucher}
                        className="text-green-400 hover:text-red-500 transition-colors"
                        title="Remove voucher"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : showVoucherInput ? (
                  <div className="mb-4">
                    <p className="text-[13px] font-medium text-gray-700 mb-2">Enter voucher code</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !voucherLoading) applyVoucher(voucherCode) }}
                        placeholder="Enter voucher code"
                        className="flex-1 border border-gray-300 rounded-[2px] px-3 py-2 text-[13px] outline-none focus:border-[#0066CC] uppercase tracking-wide font-medium"
                        autoFocus
                      />
                      <button
                        onClick={() => applyVoucher(voucherCode)}
                        disabled={voucherLoading}
                        className="bg-[#0066CC] hover:bg-[#0052A3] text-white text-[13px] font-bold px-4 py-2 rounded-[2px] transition-colors"
                      >
                        {voucherLoading ? <Spinner size={14} /> : 'Apply'}
                      </button>
                    </div>
                    {voucherError && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <AlertCircle size={13} className="text-[#D52B1E] flex-shrink-0" />
                        <p className="text-[12px] text-[#D52B1E] font-medium">{voucherError}</p>
                      </div>
                    )}
                    <button
                      onClick={() => { setShowVoucherInput(false); setVoucherCode(''); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 mt-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowVoucherInput(true)}
                    className="text-[13px] text-[#0066CC] hover:underline font-medium mb-4 block flex items-center gap-1.5"
                  >
                    <Tag size={14} />
                    + Enter a voucher code
                  </button>
                )}

                {/* Totals */}
                <div className="space-y-2.5 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">£{subtotal.toFixed(2)}</span>
                  </div>

                  {/* Discount row */}
                  {discount > 0 && (
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <Tag size={12} />
                        Voucher ({appliedVoucher.code})
                      </span>
                      <span className="text-green-600 font-bold">-£{discount.toFixed(2)}</span>
                    </div>
                  )}

                  {chargesReady && deliveryCost === 0 ? (
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-gray-600">Delivery Costs</span>
                      <span className="text-green-600 font-medium">FREE</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-gray-600">Delivery Costs</span>
                      <span data-testid="basket-delivery" className="text-gray-900">{money(deliveryCost)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 my-3"></div>

                <div className="flex items-center justify-between text-[14px] mb-1">
                  <span className="text-gray-600">VAT{chargesReady ? ` (${pricing.vatRate}%)` : ''}</span>
                  <span data-testid="basket-vat" className="text-gray-900">{money(vat)}</span>
                </div>

                {/* Savings callout */}
                {discount > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-sm px-3 py-2 mb-3">
                    <p className="text-[12px] text-green-700 font-bold flex items-center gap-1.5">
                      <Check size={14} strokeWidth={3} />
                      You're saving £{discount.toFixed(2)} with voucher {appliedVoucher.code}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mb-5">
                  <span className="text-[16px] font-bold text-gray-900">Total <span className="text-[13px] font-normal text-gray-500">(incl. VAT)</span></span>
                  <span data-testid="basket-total" className="text-[20px] font-black text-gray-900">{money(total)}</span>
                </div>

                {settingsError && (
                  <p role="alert" className="text-[12px] text-red-600 mb-3">
                    We couldn't load delivery and VAT charges.{' '}
                    <button type="button" onClick={refreshSettings} className="underline font-bold">Try again</button>
                  </p>
                )}

                {/* Checkout Button */}
                {checkoutBlocked ? (
                  <button disabled className="w-full bg-gray-300 text-white font-bold text-[15px] py-3 rounded-[2px] cursor-not-allowed block text-center">
                    {hasUnavailableItems ? 'Remove unavailable items' : settingsError ? 'Charges unavailable' : 'Checking basket…'}
                  </button>
                ) : (
                  <Link
                    to="/checkout"
                    className="w-full bg-[#D52B1E] hover:bg-[#B71C1C] text-white font-bold text-[15px] py-3 rounded-[2px] transition-colors block text-center"
                  >
                    Proceed to checkout
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
