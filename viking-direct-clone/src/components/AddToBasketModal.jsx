import { useCart } from '../context/CartContext'
import { Link } from 'react-router-dom'
import { X, Check, ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { fetchProducts } from '../api'
import ProductImage from './ProductImage'
import { getProductImage, formatPrice } from '../utils/product'

export default function AddToBasketModal() {
  const { showModal, closeModal, modalProduct } = useCart()
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (showModal) {
      // Admin-curated suggestions; don't suggest the product just added.
      fetchProducts({ section: 'viewed', limit: 4, exclude: modalProduct?.product?.id })
        .then(data => setSuggestions(data.slice(0, 3)))
        .catch(() => setSuggestions([]))
    }
  }, [showModal, modalProduct])

  if (!showModal || !modalProduct) return null

  const { product, qty } = modalProduct
  const price = parseFloat(product.priceExVat) || parseFloat(product.price) || 0
  const priceInc = formatPrice(product.priceIncVat)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[100] transition-opacity"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-[101] w-[90%] max-w-[620px] bg-white rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-[#00857C] rounded-full flex items-center justify-center flex-shrink-0">
              <Check size={14} strokeWidth={3} className="text-white" />
            </div>
            <h2 className="text-[16px] font-bold text-gray-800">
              This product has been added to your basket
            </h2>
          </div>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Product Info */}
        <div className="px-5 pb-4 flex items-center gap-4 border-b border-gray-200">
          <ProductImage
            src={getProductImage(product)}
            alt={product.name}
            className="w-[60px] h-[60px] object-contain flex-shrink-0"
            placeholderClassName="w-[60px] h-[60px] flex-shrink-0 [&>span]:hidden"
            iconSize={18}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-gray-800 leading-snug mb-1">
              {qty}x {product.name}{product.size ? ` (${product.size})` : ''}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[16px] font-black text-gray-900">
                {formatPrice(price)}
              </span>
              <span className="text-[12px] text-gray-500">each, excl. VAT</span>
            </div>
            {priceInc && <p className="text-[11px] text-gray-400">{priceInc} incl. VAT</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-4 flex items-center gap-4 border-b border-gray-200">
          <Link
            to="/cart"
            onClick={closeModal}
            className="bg-[#00857C] hover:bg-[#006B63] text-white font-bold text-[14px] px-5 py-2.5 rounded-[2px] transition-colors whitespace-nowrap"
          >
            View basket & checkout
          </Link>
          <button
            onClick={closeModal}
            className="text-[14px] text-[#0066CC] hover:underline font-medium"
          >
            Continue shopping
          </button>
        </div>

        {/* Don't forget to buy */}
        {suggestions.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-[15px] font-bold text-gray-800 whitespace-nowrap">Don't forget to buy...</h3>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {suggestions.map(s => (
                <Link
                  key={s.id}
                  to={`/product/${s.id}`}
                  onClick={closeModal}
                  className="group"
                >
                  <div className="h-[80px] flex items-center justify-center mb-2">
                    <ProductImage
                      src={getProductImage(s)}
                      alt={s.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      placeholderClassName="w-full h-full [&>span]:hidden"
                      iconSize={18}
                    />
                  </div>
                  <p className="text-[12px] text-gray-700 line-clamp-2 group-hover:text-[#0066CC] transition-colors leading-snug">
                    {s.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
