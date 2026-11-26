import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Check, Plus, Minus, AlertCircle, X } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useShoppingList } from '../context/ShoppingListContext'
import ProductImage from '../components/ProductImage'
import StateMessage from '../components/StateMessage'
import { addToRecentlyViewed } from '../utils/storage'
import { peekProduct, fetchProductImages, fetchProduct, fetchProducts, fetchProductReviews, submitProductReview, checkCanReview } from '../api'
import {
  normalizeProduct, formatPrice, getProductImage, getRating, isBuyMore, badgeLabel,
  isOutOfStock, unavailableReason, toNumber,
} from '../utils/product'

// How many products from the same category to show as related.
const RELATED_LIMIT = 4

/** Specification rows built only from fields the product actually has. */
function buildSpecifications(p) {
  const rows = []
  if (p.sku) rows.push({ label: 'SKU', value: p.sku })
  if (p.size) rows.push({ label: 'Size', value: p.size })
  if (p.thickness) rows.push({ label: 'Thickness', value: p.thickness })
  if (p.colour) rows.push({ label: 'Colour', value: p.colour.split(',').map(c => c.trim()).join(', ') })
  if (p.weightText) rows.push({ label: 'Weight', value: p.weightText })
  if (p.brandName) rows.push({ label: 'Brand', value: p.brandName })
  if (p.category?.name) rows.push({ label: 'Category', value: p.category.name })
  if (p.unitInfo) rows.push({ label: 'Packaged Quantity', value: p.unitInfo.split('\n')[0] })
  if (p.unit) rows.push({ label: 'Unit', value: p.unit })
  const weight = toNumber(p.weight)
  if (!p.weightText && weight !== null && weight > 0) rows.push({ label: 'Weight', value: `${weight} kg` })
  if (p.ecoBadge) rows.push({ label: 'Environmental Claim', value: p.ecoBadge })
  if (p.stockStatus) rows.push({ label: 'Availability', value: p.stockStatus })
  return rows
}

/** Short bullet list of real product facts for the buy box. */
function buildKeyDetails(p) {
  const details = []
  if (p.brandName) details.push(`Brand: ${p.brandName}`)
  if (p.unitInfo) details.push(p.unitInfo.split('\n')[0])
  if (p.ecoBadge) details.push(p.ecoBadge)
  if (p.deliveryText) details.push(p.deliveryText)
  return details
}

function renderStars(rating) {
  const stars = []
  const r = parseFloat(rating) || 0
  const fullStars = Math.floor(r)
  const hasHalf = r - fullStars >= 0.5
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#F5C518" stroke="#F5C518" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <div key={i} className="relative w-4 h-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#F5C518" stroke="#F5C518" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>
      )
    } else {
      stars.push(
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    }
  }
  return stars
}

/**
 * Product detail page. Everything shown comes from GET /api/products/<id>/;
 * fields the product doesn't have are hidden. Unknown ids get a "not found"
 * page and failed requests get a retry — never substitute data.
 */
export default function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | notfound | error
  const [reloadKey, setReloadKey] = useState(0)
  const [qty, setQty] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [activeTab, setActiveTab] = useState('specifications')
  const [relatedProducts, setRelatedProducts] = useState([])
  const [variants, setVariants] = useState([]) // other sizes of this product
  const [notification, setNotification] = useState(null)
  // Reviews
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [canReviewInfo, setCanReviewInfo] = useState(null) // { canReview, hasPurchased, alreadyReviewed }
  const [reviewForm, setReviewForm] = useState({ stars: 5, title: '', body: '' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [selectedBundleIds, setSelectedBundleIds] = useState([])
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const imgContainerRef = useRef(null)
  const { isLoggedIn } = useAuth()
  const { addToCart: cartAdd } = useCart()
  const { openAddToListModal } = useShoppingList()

  const [gallery, setGallery] = useState([])      // extra photos
  const [chosenImage, setChosenImage] = useState(null)
  const mainImage = getProductImage(product)
  const productImage = chosenImage || mainImage
  // Main picture first, then the gallery.
  const thumbnails = [...new Set([mainImage, ...gallery.map(g => g.url)].filter(Boolean))]

  useEffect(() => {
    let cancelled = false
    // Moving between sizes keeps the size buttons and gallery in place.
    const sameGroup = variants.some(v => String(v.id) === String(id))
    const known = peekProduct(id)
    setProduct(known ? normalizeProduct(known) : null)
    setStatus(known ? 'ready' : 'loading')
    setRelatedProducts([])
    if (!sameGroup) {
      setVariants([])
      setGallery([])
    }
    setChosenImage(null)
    setSelectedBundleIds([])
    setQty(1)
    setActiveTab(known?.description ? 'description' : 'specifications')
    setReviews([])
    setCanReviewInfo(null)
    setShowReviewForm(false)

    fetchProduct(id)
      .then(data => {
        if (cancelled) return
        const p = normalizeProduct(data)
        setProduct(p)
        setStatus('ready')
        addToRecentlyViewed(p)
        if (!known) setActiveTab(p.description ? 'description' : 'specifications')
        fetchProductImages(p.id)
          .then(list => { if (!cancelled) setGallery(list) })
          .catch(() => {}) // the main picture still shows

        if (p.groupCode) {
          fetchProducts({ group: p.groupCode })
            .then(list => { if (!cancelled) setVariants(list.map(normalizeProduct)) })
            .catch(() => {})
        }

        // Related products = other products in the same category (real relationship).
        if (p.category?.id) {
          fetchProducts({ category: p.category.parent || p.category.id, grouped: 1, ordering: 'popular', limit: 8 })
            .then(rel => {
              // Other sizes of this item have their own selector, so leave them out here.
              const others = rel.filter(r => r.id !== p.id && (!p.groupCode || r.groupCode !== p.groupCode))
              if (!cancelled) setRelatedProducts(others.slice(0, RELATED_LIMIT).map(normalizeProduct))
            })
            .catch(() => { if (!cancelled) setRelatedProducts([]) })
        }
      })
      .catch(err => {
        if (cancelled) return
        setStatus(err.status === 404 ? 'notfound' : 'error')
      })

    return () => { cancelled = true }
  }, [id, reloadKey])

  // Load reviews + can-review status when the reviews tab becomes active
  useEffect(() => {
    if (activeTab !== 'reviews' || !id || status !== 'ready') return
    setReviewsLoading(true)
    fetchProductReviews(id)
      .then(setReviews)
      .catch(console.error)
      .finally(() => setReviewsLoading(false))

    if (isLoggedIn) {
      checkCanReview(id).then(setCanReviewInfo).catch(console.error)
    } else {
      setCanReviewInfo(null)
    }
  }, [activeTab, id, status])

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!isLoggedIn) return
    setReviewSubmitting(true)
    try {
      await submitProductReview({ ...reviewForm, productId: parseInt(id) })
      setShowReviewForm(false)
      setReviewForm({ stars: 5, title: '', body: '' })
      setCanReviewInfo(prev => ({ ...prev, canReview: false, alreadyReviewed: true }))
      // Re-fetch reviews
      const updated = await fetchProductReviews(id)
      setReviews(updated)
      showNotification('Review submitted successfully!')
    } catch (err) {
      showNotification(err.message || 'Failed to submit review', 'error')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const blocked = product ? unavailableReason(product) : 'Unavailable'

  // Main "Add to basket": only this product. (It used to silently add every
  // pre-selected bundle item too.)
  const handleAddToCart = () => {
    if (blocked || !cartAdd(product, qty)) return
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  // "Add bundle to basket": this product plus the related items the shopper ticked.
  const handleAddBundle = () => {
    if (blocked) return
    const extras = relatedProducts.filter(rp => selectedBundleIds.includes(rp.id) && !unavailableReason(rp))
    extras.forEach(rp => cartAdd(rp, 1))
    cartAdd(product, qty) // last, so the basket popup shows the main product
    showNotification(`Added ${extras.length + 1} item${extras.length ? 's' : ''} to your basket`)
  }

  const handleAddToListBtnClick = () => {
    openAddToListModal(product)
  }

  if (status === 'loading') {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 py-8">
          <div className="animate-pulse" aria-busy="true">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-2 gap-8">
              <div className="h-[400px] bg-gray-100 rounded"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-32 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'notfound') {
    return (
      <div className="bg-white min-h-screen">
        <StateMessage
          title="Product not found"
          message="This product doesn't exist or is no longer available."
        >
          <Link to="/category" className="mt-4 text-[13px] text-[#0066CC] hover:underline">Browse all products</Link>
        </StateMessage>
      </div>
    )
  }

  if (status === 'error' || !product) {
    return (
      <div className="bg-white min-h-screen">
        <StateMessage
          variant="error"
          title="We couldn't load this product"
          message="Please check your connection and try again."
          onRetry={() => setReloadKey(k => k + 1)}
        />
      </div>
    )
  }

  const priceEx = formatPrice(product.priceExVat)
  const priceInc = formatPrice(product.priceIncVat)
  const specifications = buildSpecifications(product)
  const rating = getRating(product)
  const otherBadge = !isBuyMore(product) ? badgeLabel(product.badge) : null
  const outOfStock = isOutOfStock(product)

  const attributes = (product.keyAttributes || '').split('\n').filter(Boolean)
  const keyDetails = attributes.length > 0 ? attributes : buildKeyDetails(product)
  const tabs = [
    ...(product.description ? [{ id: 'description', label: 'Description' }] : []),
    { id: 'specifications', label: 'Specifications' },
    ...(relatedProducts.length > 0 ? [{ id: 'related', label: 'Related products' }] : []),
    { id: 'reviews', label: 'Reviews' },
  ]

  const bundleItems = relatedProducts.filter(rp => selectedBundleIds.includes(rp.id) && !unavailableReason(rp))
  const bundleTotal = (product.priceExVat || 0) * qty + bundleItems.reduce((sum, rp) => sum + rp.priceExVat, 0)

  // Rating summary: real reviews first; otherwise the rating stored on the product.
  const reviewAverage = reviews.length > 0 ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null
  const summaryStars = reviewAverage ?? rating?.stars ?? null
  const summaryCount = reviews.length > 0 ? reviews.length : (rating?.count || 0)

  return (
    <div key={product.id} className="bg-white min-h-screen soft-in">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 py-3">
          <nav className="text-[12px] text-gray-500">
            <ol className="flex items-center gap-1.5">
              <li><Link to="/home" className="hover:underline">Home</Link></li>
              <li>›</li>
              {product.category?.parentSlug && (
                <>
                  <li><Link to={`/category/${product.category.parentSlug}`} className="hover:underline">{product.category.parentName}</Link></li>
                  <li>›</li>
                </>
              )}
              {product.category?.slug ? (
                <li><Link to={`/category/${product.category.slug}`} className="hover:underline">{product.category.name}</Link></li>
              ) : (
                <li><Link to="/category" className="hover:underline">All Products</Link></li>
              )}
              <li>›</li>
              <li className="text-gray-900 truncate max-w-[300px]">{product.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 pt-6 pb-12">
        {/* Product Title */}
        <h1 className="text-[24px] font-bold text-gray-900 leading-tight mb-2 max-w-[700px]">
          {product.name}
        </h1>
        <div className="flex items-center flex-wrap gap-3 text-[13px] text-gray-500 mb-6">
          {product.brandName && (
            <>
              <span className="text-gray-300">|</span>
              <span>Brand: <Link to={`/search?brand=${encodeURIComponent(product.brandName)}`} className="text-[#00857C] hover:underline font-medium">{product.brandName}</Link></span>
            </>
          )}
          {product.sku && (
            <>
              <span className="text-gray-300">|</span>
              <span>SKU {product.sku}</span>
            </>
          )}
          {rating && (
            <>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                {renderStars(rating.stars)}
                {rating.count > 0 && <span className="ml-1">({rating.count})</span>}
              </span>
            </>
          )}
        </div>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

          {/* Left: Product Image */}
          <div className="relative">
            {/* Image container with lens */}
            <div
              ref={imgContainerRef}
              className={`border border-gray-200 rounded-sm p-4 flex items-center justify-center min-h-[400px] bg-white relative select-none ${productImage ? 'cursor-crosshair' : ''}`}
              onMouseMove={(e) => {
                if (!productImage) return
                const rect = imgContainerRef.current.getBoundingClientRect()
                const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
                const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
                setZoomPos({ x, y })
              }}
              onMouseEnter={() => productImage && setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
            >
              {product.ecoBadge && (
                <div className="absolute top-4 left-4 bg-[#6EAA3C] text-white text-[13px] font-bold px-3 py-1 rounded-sm z-10">
                  {product.ecoBadge}
                </div>
              )}

              <ProductImage
                src={productImage}
                alt={product.name}
                className="max-h-[360px] max-w-full object-contain pointer-events-none"
                placeholderClassName="w-full h-[360px]"
                iconSize={48}
              />

              {/* Lens rectangle that follows the cursor */}
              {isZooming && (
                <div
                  className="absolute w-[110px] h-[110px] border-2 border-blue-400/70 bg-blue-50/20 pointer-events-none z-20"
                  style={{
                    left: `${zoomPos.x}%`,
                    top: `${zoomPos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}

              {/* Hover hint */}
              {productImage && !isZooming && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 border border-gray-200 rounded px-2 py-1 text-[11px] text-gray-500 shadow-sm pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  Hover to zoom
                </div>
              )}
            </div>

            {/* Zoom panel — floats to the right, shows magnified image */}
            {isZooming && productImage && (
              <div className="absolute top-0 left-[calc(100%+16px)] w-[440px] h-[400px] border border-gray-200 bg-white shadow-2xl z-50 rounded-sm overflow-hidden pointer-events-none">
                <img
                  src={productImage}
                  alt=""
                  className="w-full h-full object-contain"
                  style={{
                    transform: 'scale(3)',
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  }}
                />
              </div>
            )}

            {/* Photo gallery */}
            {thumbnails.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-3" data-testid="gallery">
                {thumbnails.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setChosenImage(url)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={url === productImage ? 'true' : undefined}
                    className={`w-[64px] h-[64px] border rounded-sm bg-white p-1 ${url === productImage ? 'border-[#0066CC] ring-1 ring-[#0066CC]' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Environmental Claims (only when the product has one) */}
            {product.ecoBadge && (
              <div className="mt-6">
                <h4 className="text-[14px] font-bold text-gray-800 mb-2">Environmental claims</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-gray-200 rounded-sm flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6EAA3C" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="text-[13px] text-gray-700">{product.ecoBadge}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Pricing & Actions */}
          <div>
            {/* Badge + Price */}
            <div className="mb-4">
              {isBuyMore(product) && (
                <p className="text-[14px] font-bold mb-1">
                  Buy More, <span className="text-[#D52B1E]">Save More</span>
                </p>
              )}
              {otherBadge && <p className="text-[14px] font-bold text-[#D52B1E] mb-1">{otherBadge}</p>}
              {priceEx ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[36px] font-black text-gray-900 leading-none tracking-tight">
                      {priceEx}
                    </span>
                    {product.unitInfo && (
                      <span className="text-[13px] text-gray-500 whitespace-pre-line leading-tight">
                        {product.unitInfo}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400 mt-1">
                    excl. VAT{priceInc ? ` · ${priceInc} incl. VAT` : ''}
                  </p>
                </>
              ) : (
                <p className="text-[16px] font-semibold text-gray-500">Price not available</p>
              )}
            </div>

            {/* Stock Status */}
            {product.stockStatus && (
              <div className={`flex items-start gap-1.5 mb-4 text-[13px] ${outOfStock ? 'text-[#D52B1E]' : 'text-[#00857C]'}`}>
                {outOfStock
                  ? <X size={16} strokeWidth={3} className="mt-0.5 flex-shrink-0" />
                  : <Check size={16} strokeWidth={3} className="mt-0.5 flex-shrink-0" />}
                <p>
                  <span className="font-bold">{product.stockStatus}</span>
                  {product.deliveryText && <> - {product.deliveryText}</>}
                </p>
              </div>
            )}

            {/* Size selector: products sharing a group code */}
            {variants.length > 1 && (
              <div className="mb-4">
                <p className="text-[13px] font-bold text-gray-800 mb-2">Size{product.size ? `: ${product.size}` : ''}</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => (
                    <Link
                      key={v.id}
                      to={`/product/${v.id}`}
                      aria-current={v.id === product.id ? 'true' : undefined}
                      className={`border rounded-[2px] px-3 py-1.5 text-[13px] font-semibold ${
                        v.id === product.id ? 'border-[#0066CC] bg-[#F0F7FF] text-[#0066CC]' : 'border-gray-300 text-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {v.size || v.sku}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {product.bulkFrom && (
              <p className="text-[13px] text-gray-600 mb-3">Bulk from: <strong>{product.bulkFrom}</strong></p>
            )}

            {/* Add to Cart */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center border border-gray-300 rounded-[2px] h-[42px] overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-2.5 h-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors border-r border-gray-200"
                >
                  <Minus size={14} strokeWidth={3} />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-[45px] h-full text-center text-[16px] font-bold outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="1"
                />
                <button
                  onClick={() => setQty(qty + 1)}
                  className="px-2.5 h-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors border-l border-gray-200"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!!blocked}
                className={`flex-1 h-[42px] flex items-center justify-center gap-2 rounded-[2px] font-bold text-[15px] transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed ${
                  addedToCart
                    ? 'bg-[#00857C] text-white'
                    : 'bg-[#0066CC] hover:bg-[#0052A3] text-white'
                }`}
              >
                <ShoppingCart size={20} />
                {blocked || (addedToCart ? 'Added!' : 'Add to basket')}
              </button>
            </div>

            <button onClick={handleAddToListBtnClick} className="text-[14px] text-[#0066CC] hover:underline font-medium mb-6">
              +Add to a list
            </button>

            {/* Key details — real product fields only */}
            {keyDetails.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[15px] font-bold text-gray-800 mb-3">{attributes.length > 0 ? 'Key attributes' : 'Key details'}</h3>
                <ul className="space-y-1.5">
                  {keyDetails.map((detail, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-gray-700">
                      <Check size={16} strokeWidth={3} className="text-[#0066CC] flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Mini Cart Bar */}
        <div className="sticky top-[60px] z-40 bg-white border-y border-gray-200 py-2.5 px-4 -mx-4 mb-8 flex items-center gap-4">
          <ProductImage
            src={productImage}
            alt={product.name}
            className="w-10 h-10 object-contain flex-shrink-0"
            placeholderClassName="w-10 h-10 flex-shrink-0 [&>span]:hidden"
            iconSize={16}
          />
          <p className="text-[13px] font-bold text-gray-800 flex-1 truncate">{product.name}</p>
          {isBuyMore(product) && (
            <p className="text-[13px] font-bold whitespace-nowrap">
              Buy More, <span className="text-[#D52B1E]">Save More</span>
            </p>
          )}
          {priceEx && <span className="text-[22px] font-black text-gray-900">{priceEx}</span>}
          {product.unitInfo && (
            <span className="text-[11px] text-gray-500 whitespace-pre-line leading-tight max-w-[60px]">
              {product.unitInfo.split('\n')[0]}
            </span>
          )}
          <div className="flex items-center border border-gray-300 rounded-[2px] h-8 overflow-hidden">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="px-1.5 h-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors border-r border-gray-200"
            >
              <Minus size={12} strokeWidth={3} />
            </button>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-[35px] h-full text-center text-[14px] font-bold outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="1"
            />
            <button
              onClick={() => setQty(qty + 1)}
              className="px-1.5 h-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors border-l border-gray-200"
            >
              <Plus size={12} strokeWidth={3} />
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!!blocked}
            className="bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[14px] px-5 py-2 rounded-[2px] flex items-center gap-2 whitespace-nowrap disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={16} />
            {blocked || 'Add to basket'}
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-[14px] font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#0066CC] border-[#0066CC]'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'description' && product.description && (
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[18px] font-bold text-gray-800">Description</h2>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>
            <p className="text-[14px] text-gray-600 leading-relaxed max-w-[900px] whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {activeTab === 'specifications' && (
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[18px] font-bold text-gray-800">Specifications</h2>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>
            {specifications.length > 0 ? (
              <table className="w-full max-w-[900px]">
                <tbody>
                  {specifications.map((spec, idx) => (
                    <tr key={spec.label} className={idx % 2 === 0 ? 'bg-[#F9F9F9]' : 'bg-white'}>
                      <td className="py-3 px-4 text-[14px] font-medium text-gray-600 w-[200px]">{spec.label}</td>
                      <td className="py-3 px-4 text-[14px] text-gray-800">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[14px] text-gray-500">No specifications available for this product.</p>
            )}
          </div>
        )}

        {activeTab === 'related' && relatedProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[18px] font-bold text-gray-800">Related products</h2>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>
            <p className="text-[13px] text-gray-500 mb-4">
              More from {product.category?.parentName || product.category?.name}. Tick items to add them to your basket with this product.
            </p>
            <div className="flex flex-col lg:flex-row items-start gap-8">
              {/* Main product */}
              <div className="w-[180px] flex-shrink-0 text-center">
                <div className="border border-gray-100 rounded-sm p-4 mb-3">
                  <ProductImage src={productImage} alt={product.name} className="w-full aspect-square object-contain mx-auto" placeholderClassName="w-full aspect-square" />
                </div>
                <p className="text-[13px] font-bold text-gray-700 leading-tight mb-2">{product.name}</p>
              </div>

              <div className="hidden lg:flex text-2xl text-gray-300 mt-20">+</div>

              {/* Related bundle items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {relatedProducts.map(rp => {
                  const rpPrice = formatPrice(rp.priceExVat)
                  const selectable = !unavailableReason(rp)
                  const isSelected = selectedBundleIds.includes(rp.id)
                  return (
                    <div
                      key={rp.id}
                      onClick={() => {
                        if (!selectable) return
                        setSelectedBundleIds(prev =>
                          prev.includes(rp.id) ? prev.filter(x => x !== rp.id) : [...prev, rp.id]
                        )
                      }}
                      className={`border rounded-sm p-4 transition-all ${selectable ? 'cursor-pointer' : 'opacity-60'} ${
                        isSelected ? 'border-[#0066CC] bg-[#F0F7FF]' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-5 h-5 rounded-sm flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-[#0066CC] border-[#0066CC]' : 'bg-white border-gray-300'
                        }`}>
                          {isSelected && <Check size={14} strokeWidth={4} className="text-white" />}
                        </div>
                        <span className={`text-[12px] font-bold ${isSelected ? 'text-[#0066CC]' : 'text-gray-500'}`}>
                          {unavailableReason(rp) || (isSelected ? 'Added to bundle' : 'Add to bundle')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white border border-gray-50 rounded-sm p-2 flex-shrink-0">
                          <ProductImage src={getProductImage(rp)} alt={rp.name} className="w-full h-full object-contain" placeholderClassName="w-full h-full [&>span]:hidden" iconSize={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${rp.id}`} onClick={e => e.stopPropagation()} className="text-[12px] text-gray-800 font-medium line-clamp-2 mb-1 hover:text-[#0066CC] hover:underline">{rp.name}{rp.size ? ` (${rp.size})` : ''}</Link>
                          <div className="flex items-baseline gap-1.5">
                            {rpPrice
                              ? <><p className="text-[15px] font-black text-gray-900">{rpPrice}</p><p className="text-[10px] text-gray-400">excl. VAT</p></>
                              : <p className="text-[12px] text-gray-500">Price not available</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Total Price Summary */}
            <div className="mt-8 bg-gray-50 rounded-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-gray-100">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Bundle Total ({bundleItems.length + 1} item{bundleItems.length ? 's' : ''})</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">£{bundleTotal.toFixed(2)}</span>
                  <span className="text-xs text-gray-400">excl. VAT</span>
                </div>
              </div>
              <button
                onClick={handleAddBundle}
                disabled={!!blocked}
                className="bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[16px] px-10 py-3 rounded-[2px] shadow-sm active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add bundle to basket
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[18px] font-bold text-gray-800">Reviews</h2>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>

            {/* Rating Summary */}
            <div className="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b border-gray-200">
              {/* Overall score */}
              <div className="flex flex-col items-center justify-center bg-[#F9F9F9] border border-gray-200 rounded-sm px-10 py-6 flex-shrink-0">
                <span className="text-[56px] font-black text-gray-900 leading-none">
                  {summaryStars !== null ? summaryStars.toFixed(1) : '–'}
                </span>
                <div className="flex items-center gap-0.5 my-2">
                  {renderStars(summaryStars || 0)}
                </div>
                <p className="text-[13px] text-gray-500">
                  {summaryCount > 0
                    ? `${summaryCount} ${reviews.length > 0 ? 'review' : 'rating'}${summaryCount !== 1 ? 's' : ''}`
                    : 'No reviews yet'}
                </p>
              </div>

              {/* Breakdown bars (posted reviews only) */}
              <div className="flex-1 space-y-2 justify-center flex flex-col">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter(r => r.stars === star).length
                  const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-[13px] text-[#0066CC] w-8 text-right flex-shrink-0">{star} ★</span>
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F5C518] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[12px] text-gray-500 w-8 flex-shrink-0">{count}</span>
                    </div>
                  )
                })}
              </div>

              {/* Write a review CTA */}
              <div className="flex flex-col items-center justify-center gap-3 flex-shrink-0">
                {!isLoggedIn ? (
                  <>
                    <p className="text-[13px] text-gray-500 text-center">Sign in to leave a review</p>
                    <Link to="/login" className="bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[14px] px-6 py-2.5 rounded-[2px] transition-colors whitespace-nowrap">
                      Sign In
                    </Link>
                  </>
                ) : canReviewInfo?.alreadyReviewed ? (
                  <p className="text-[13px] text-[#00857C] font-medium text-center flex items-center gap-1">
                    <Check size={14} strokeWidth={3} /> You reviewed this product
                  </p>
                ) : canReviewInfo?.hasPurchased === false ? (
                  <p className="text-[13px] text-gray-500 text-center">Purchase this product<br />to leave a review</p>
                ) : canReviewInfo?.canReview ? (
                  <>
                    <p className="text-[13px] text-gray-600 text-center">Share your experience<br />with this product</p>
                    <button
                      onClick={() => setShowReviewForm(v => !v)}
                      className="bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[14px] px-6 py-2.5 rounded-[2px] transition-colors whitespace-nowrap"
                    >
                      {showReviewForm ? 'Cancel' : 'Write a Review'}
                    </button>
                  </>
                ) : (
                  <p className="text-[13px] text-gray-400 text-center">Checking eligibility…</p>
                )}
              </div>
            </div>

            {/* Write Review Form */}
            {showReviewForm && canReviewInfo?.canReview && (
              <form onSubmit={handleSubmitReview} className="bg-[#F9F9F9] border border-gray-200 rounded-sm p-6 mb-8">
                <h3 className="text-[15px] font-bold text-gray-800 mb-4">Write Your Review</h3>

                {/* Star picker */}
                <div className="mb-4">
                  <label className="text-[13px] text-gray-600 mb-1.5 block">Your Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewForm(f => ({ ...f, stars: s }))}
                        className="focus:outline-none"
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24"
                          fill={s <= reviewForm.stars ? '#F5C518' : 'none'}
                          stroke={s <= reviewForm.stars ? '#F5C518' : '#D1D5DB'}
                          strokeWidth="1.5"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    ))}
                    <span className="text-[13px] text-gray-500 ml-2">{reviewForm.stars} / 5</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[13px] text-gray-600 mb-1.5 block">Review Title</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Summarise your experience"
                    value={reviewForm.title}
                    onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-[2px] px-3 py-2 text-[14px] text-gray-800 focus:outline-none focus:border-[#0066CC]"
                  />
                </div>

                <div className="mb-5">
                  <label className="text-[13px] text-gray-600 mb-1.5 block">Your Review</label>
                  <textarea
                    required
                    rows={4}
                    maxLength={1000}
                    placeholder="Tell others about your experience with this product…"
                    value={reviewForm.body}
                    onChange={e => setReviewForm(f => ({ ...f, body: e.target.value }))}
                    className="w-full border border-gray-300 rounded-[2px] px-3 py-2 text-[14px] text-gray-800 focus:outline-none focus:border-[#0066CC] resize-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1 text-right">{reviewForm.body.length}/1000</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="bg-[#0066CC] hover:bg-[#0052A3] disabled:opacity-50 text-white font-bold text-[14px] px-8 py-2.5 rounded-[2px] transition-colors"
                  >
                    {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="text-[14px] text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Review list */}
            {reviewsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse border-b border-gray-100 pb-6">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-[14px] text-gray-500">No reviews yet. Be the first to review this product.</p>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-0.5">{renderStars(review.stars)}</div>
                      {review.isVerifiedPurchase && (
                        <span className="flex items-center gap-1 text-[11px] text-[#00857C] font-medium">
                          <Check size={11} strokeWidth={3} />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-gray-900 mb-1">{review.title}</p>
                    <p className="text-[13px] text-gray-600 leading-relaxed mb-3">{review.body}</p>
                    <p className="text-[12px] text-gray-400">
                      <strong className="text-gray-600">{review.authorName}</strong> · {review.createdAt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* More from this category */}
        {relatedProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[18px] font-bold text-gray-800">More from {product.category?.parentName || product.category?.name}</h2>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
              {product.category?.slug && (
                <Link to={`/category/${product.category.parentSlug || product.category.slug}`} className="text-[13px] text-[#0066CC] hover:underline whitespace-nowrap">
                  See all ›
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map(rp => {
                const rpPrice = formatPrice(rp.priceExVat)
                return (
                  <Link
                    key={rp.id}
                    to={`/product/${rp.id}`}
                    className="bg-white border border-gray-200 rounded-sm p-4 hover:shadow-md transition-shadow group"
                  >
                    <div className="h-[160px] flex items-center justify-center mb-3">
                      <ProductImage src={getProductImage(rp)} alt={rp.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" placeholderClassName="w-full h-full" />
                    </div>
                    <p className="text-[13px] text-gray-700 hover:text-[#0066CC] line-clamp-2 mb-2">{rp.name}</p>
                    {rpPrice ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          {rp.priceVaries && <span className="text-[11px] font-semibold text-gray-500">From</span>}
                          <span className="text-[20px] font-black text-gray-900">{rpPrice}</span>
                          {rp.unitInfo && <span className="text-[11px] text-gray-500 line-clamp-1">{rp.unitInfo.split('\n')[0]}</span>}
                        </div>
                        <p className="text-[11px] text-gray-400">excl. VAT</p>
                      </>
                    ) : (
                      <p className="text-[12px] text-gray-500">Price not available</p>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-sm shadow-lg flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'error' ? 'bg-[#D52B1E] text-white' : 'bg-[#00857C] text-white'
        }`}>
          {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
