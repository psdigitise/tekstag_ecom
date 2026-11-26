import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import ProductImage from './ProductImage'
import { formatPrice, getProductImage, isBuyMore, badgeLabel, unavailableReason } from '../utils/product'

/** Compact product card used in homepage product rows. Shows only real product fields. */
export default function ProductCard({ product }) {
  const [qty, setQty] = useState(1)
  const { addToCart } = useCart()

  const priceEx = formatPrice(product.priceExVat)
  const priceInc = formatPrice(product.priceIncVat)
  const otherBadge = !isBuyMore(product) ? badgeLabel(product.badge) : null

  const blocked = unavailableReason(product)
  const handleAddToCart = () => addToCart(product, qty)
  const sizes = product.variantCount > 1 ? product.variantCount : 0
  const from = sizes && product.priceVaries ? 'From ' : ''

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-4 flex flex-col group hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:border-gray-300 transition-all duration-200">
      {/* Product Image */}
      <Link to={`/product/${product.id}`} className="relative block mb-3 overflow-hidden">
        <div className="h-[200px] flex items-center justify-center bg-white">
          <ProductImage
            src={getProductImage(product)}
            alt={product.name}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
            placeholderClassName="w-full h-full"
          />
        </div>
      </Link>

      {/* Product Name */}
      <Link to={`/product/${product.id}`} className="flex-1">
        <p className="text-[13px] text-gray-700 leading-snug hover:text-[#D52B1E] transition-colors line-clamp-3">
          {sizes ? product.name : product.shortName || product.name}
        </p>
        {(sizes > 0 || product.size) && (
          <p className="text-[12px] font-semibold text-gray-500 mt-0.5">{sizes ? `${sizes} sizes available` : `Size: ${product.size}`}</p>
        )}
      </Link>

      {/* Badge + Price */}
      <div className="mt-3">
        {isBuyMore(product) && (
          <p className="text-[11px] font-semibold mb-0.5">
            Buy More, <span className="text-[#D52B1E]">Save More</span>
          </p>
        )}
        {otherBadge && (
          <p className="text-[11px] font-semibold text-[#D52B1E] mb-0.5">{otherBadge}</p>
        )}

        {priceEx ? (
          <>
            <div className="flex items-baseline gap-1">
              {from && <span className="text-[12px] font-semibold text-gray-500">{from}</span>}
              <span className="text-[22px] font-black text-gray-900">{priceEx}</span>
              {(product.unit || product.unitInfo) && <span className="text-[12px] text-gray-500">{product.unit || product.unitInfo}</span>}
            </div>
            {!sizes && product.bulkFrom && (
              <p className="text-[11px] text-gray-500">{product.bulkFrom}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-0.5">
              excl. VAT{priceInc && !from ? ` · ${priceInc} incl. VAT` : ''}
            </p>
          </>
        ) : (
          <p className="text-[13px] font-semibold text-gray-500">Price not available</p>
        )}
      </div>

      {blocked === 'Out of stock' && (
        <p className="mt-2 text-[12px] font-bold text-[#D52B1E]">Out of stock</p>
      )}

      {/* Add to Cart */}
      {sizes ? (
        <Link to={`/product/${product.id}`} className="mt-3 h-8 flex items-center justify-center rounded-sm font-semibold text-[13px] bg-[#0066CC] hover:bg-[#0052A3] text-white transition-colors">
          Choose size
        </Link>
      ) : (
      <div className="mt-3 flex items-center gap-2">
        {/* Quantity Control */}
        <div className="flex items-center border border-gray-300 rounded-sm">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Minus size={12} strokeWidth={2.5} />
          </button>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-10 h-8 text-center text-sm font-medium outline-none border-x border-gray-300"
            min="1"
          />
          <button
            onClick={() => setQty(qty + 1)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>
        </div>

        {/* Cart button */}
        <button
          onClick={handleAddToCart}
          disabled={!!blocked}
          aria-label={blocked || 'Add to basket'}
          title={blocked || 'Add to basket'}
          className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-sm font-semibold text-[13px] transition-all duration-200 bg-[#0066CC] hover:bg-[#0052A3] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={16} />
        </button>
      </div>
      )}
    </div>
  )
}
