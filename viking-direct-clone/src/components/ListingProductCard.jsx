import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Check, X } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useShoppingList } from '../context/ShoppingListContext'
import ProductImage from './ProductImage'
import {
  formatPrice, getProductImage, getRating, isBuyMore, badgeLabel, isOutOfStock, unavailableReason,
} from '../utils/product'

function Stars({ rating }) {
  const stars = []
  const fullStars = Math.floor(rating || 0)
  const hasHalfStar = (rating || 0) - fullStars >= 0.5

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F5C518" stroke="#F5C518" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <div key={i} className="relative w-[14px] h-[14px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#F5C518" stroke="#F5C518" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>
      )
    } else {
      stars.push(
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    }
  }
  return <>{stars}</>
}

/** Stock line: green tick when available, red cross when out of stock. Delivery text only if set. */
function StockStatus({ product, compact = false }) {
  if (!product.stockStatus) return null
  const out = isOutOfStock(product)
  const Icon = out ? X : Check
  return (
    <p className={`text-[12px] leading-snug ${out ? 'text-[#D52B1E]' : 'text-[#00857C]'}`}>
      <span className="font-bold inline-flex items-center gap-1">
        <Icon size={compact ? 12 : 14} strokeWidth={3} />
        {product.stockStatus}{!compact && product.deliveryText ? ' -' : ''}
      </span>
      {!compact && product.deliveryText && <span> {product.deliveryText}</span>}
    </p>
  )
}

export default function ListingProductCard({ product, viewMode = 'grid' }) {
  const [qty, setQty] = useState(1)

  const { addToCart } = useCart()
  const { openAddToListModal } = useShoppingList()

  const image = getProductImage(product)
  const rating = getRating(product)
  const priceEx = formatPrice(product.priceExVat)
  const priceInc = formatPrice(product.priceIncVat)
  const hasPrice = priceEx !== null
  const otherBadge = !isBuyMore(product) ? badgeLabel(product.badge) : null
  const blocked = unavailableReason(product) // null when it can be bought

  const handleAddToCart = () => addToCart(product, qty)

  // A card that stands for several sizes: the shopper picks one on the product page.
  const sizes = product.variantCount > 1 ? product.variantCount : 0
  const sizeLine = sizes ? `${sizes} sizes available` : product.size ? `Size: ${product.size}` : null
  const from = sizes && product.priceVaries ? 'From ' : ''

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 bg-white hover:bg-gray-50 transition-colors">
        {/* Image */}
        <Link to={`/product/${product.id}`} className="flex-shrink-0">
          <ProductImage
            src={image}
            alt={product.name}
            className="w-[80px] h-[80px] object-contain"
            placeholderClassName="w-[80px] h-[80px]"
            iconSize={20}
          />
        </Link>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <Link to={`/product/${product.id}`}>
            <h3 className="text-[14px] font-bold text-gray-800 hover:text-[#0066CC] hover:underline leading-snug line-clamp-2 mb-1">
              {product.name}
            </h3>
          </Link>
          {sizeLine && <p className="text-[12px] font-semibold text-gray-600 mb-1">{sizeLine}</p>}
          {rating && (
            <div className="flex items-center gap-1 mb-1">
              <Stars rating={rating.stars} />
              {rating.count > 0 && <span className="text-[12px] text-gray-500 ml-1">({rating.count})</span>}
            </div>
          )}
          <StockStatus product={product} compact />
        </div>

        {/* Price + Cart */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2 min-w-[160px]">
          <div className="text-right">
            {hasPrice ? (
              <>
                <div className="text-[24px] font-black text-gray-900 leading-none">{from && <span className="text-[13px] font-semibold text-gray-500">{from}</span>}{priceEx}</div>
                <div className="text-[11px] text-gray-400">excl. VAT{priceInc ? ` · ${priceInc} incl. VAT` : ''}</div>
              </>
            ) : (
              <div className="text-[13px] font-semibold text-gray-500">Price not available</div>
            )}
          </div>
          {sizes ? (
            <Link to={`/product/${product.id}`} className="h-8 px-3 flex items-center rounded-[2px] font-bold text-[13px] bg-[#0066CC] hover:bg-[#0052A3] text-white">
              Choose size
            </Link>
          ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-[42px] h-8 border border-gray-300 rounded-[2px] text-center text-[14px] font-semibold outline-none focus:border-[#0066CC]"
              min="1"
              disabled={!!blocked}
            />
            <button
              onClick={handleAddToCart}
              disabled={!!blocked}
              className="h-8 px-3 flex items-center gap-1.5 rounded-[2px] font-bold text-[13px] transition-all bg-[#0066CC] hover:bg-[#0052A3] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={15} />
              {blocked ? 'Unavailable' : 'Add'}
            </button>
          </div>
          )}
        </div>
      </div>
    )
  }

  // ── GRID VIEW (default) ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300">

      {/* Image Area */}
      <Link to={`/product/${product.id}`} className="relative block mb-4 group h-[200px] flex items-center justify-center overflow-hidden rounded-sm">
        <ProductImage
          src={image}
          alt={product.name}
          className="max-h-[190px] max-w-full object-contain group-hover:scale-110 transition-transform duration-300 ease-out"
          placeholderClassName="w-full h-[190px]"
        />

        {/* Eco badge (real product field) */}
        {product.ecoBadge && (
          <div className="absolute bottom-0 left-0 bg-[#6EAA3C] text-white text-[12px] font-bold px-2 py-0.5 rounded-sm">
            {product.ecoBadge}
          </div>
        )}
      </Link>

      {/* Product Title */}
      <Link to={`/product/${product.id}`} className="mb-2">
        <h3 className="text-[14px] font-bold text-gray-800 hover:text-[#0066CC] hover:underline leading-snug line-clamp-2">
          {product.name}
        </h3>
      </Link>

      {sizeLine && <p className="text-[13px] font-semibold text-gray-600 -mt-1 mb-2">{sizeLine}</p>}

      {/* Ratings — only when the product has rating data */}
      {rating && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            <Stars rating={rating.stars} />
          </div>
          {rating.count > 0 && <span className="text-[13px] text-gray-500">({rating.count})</span>}
        </div>
      )}

      {/* Pricing Block */}
      <div className="mb-3">
        {isBuyMore(product) && (
          <p className="text-[13px] font-bold mb-1">
            Buy More, <span className="text-[#D52B1E]">Save More</span>
          </p>
        )}
        {otherBadge && (
          <p className="text-[13px] font-bold text-[#D52B1E] mb-1">{otherBadge}</p>
        )}

        {hasPrice ? (
          <>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[26px] font-black tracking-tight text-gray-900 leading-none">
                {from && <span className="text-[13px] font-semibold text-gray-500 tracking-normal">{from}</span>}{priceEx}
              </span>
              {product.unitInfo && (
                <span className="text-[11px] text-gray-500 whitespace-pre-line leading-tight">
                  {product.unitInfo}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              excl. VAT{priceInc && !from ? ` · ${priceInc} incl. VAT` : ''}
            </p>
          </>
        ) : (
          <p className="text-[13px] font-semibold text-gray-500">Price not available</p>
        )}
      </div>

      {/* Stock Status */}
      {product.stockStatus && (
        <div className="mb-4">
          <StockStatus product={product} />
        </div>
      )}

      {/* Action Row */}
      {sizes ? (
        <Link to={`/product/${product.id}`} className="mt-auto h-9 flex items-center justify-center rounded-[2px] font-bold text-[14px] bg-[#0066CC] hover:bg-[#0052A3] text-white transition-colors">
          Choose size
        </Link>
      ) : (<>
      <div className="flex items-center gap-2 mb-3 mt-auto">
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-[45px] h-9 border border-gray-300 rounded-[2px] text-center text-[15px] font-semibold outline-none focus:border-[#0066CC]"
          min="1"
          disabled={!!blocked}
        />

        <button
          onClick={handleAddToCart}
          disabled={!!blocked}
          className="flex-1 h-9 flex items-center justify-center gap-2 rounded-[2px] font-bold text-[14px] transition-all duration-200 bg-[#0066CC] hover:bg-[#0052A3] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={18} />
          {blocked || 'Add to basket'}
        </button>
      </div>

      {/* Add to list */}
      <div className="mt-1">
        <button
          onClick={() => openAddToListModal(product)}
          className="text-[13px] text-[#0066CC] hover:underline font-medium"
        >
          +Add to a list
        </button>
      </div>
      </>)}

    </div>
  )
}
