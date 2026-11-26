import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom'
import ListingSidebar from '../components/ListingSidebar'
import Pagination from '../components/Pagination'
import CategoryBanner from '../components/listing/CategoryBanner'
import ProductSpotlight from '../components/listing/ProductSpotlight'
import MoreToExplore from '../components/listing/MoreToExplore'
import ListingProductCard from '../components/ListingProductCard'
import StateMessage from '../components/StateMessage'
import { fetchProducts, fetchProductFacets, peekProducts, peekFacets } from '../api'
import { useCategories } from '../context/CategoriesContext'
import { useSiteSettings } from '../context/SettingsContext'
import { normalizeProduct, getProductImage } from '../utils/product'

const EMPTY_FILTERS = { category: [], vikingSelection: [], brand: [], price: [], availability: [] }

const PAGE_SIZE = 24
const ORDERINGS = { popular: 'popular', priceLow: 'price_asc', priceHigh: 'price_desc' }
const EMPTY_RESULT = { results: [], count: 0, page: 1, totalPages: 1 }

function buildQuery(scope, page, sortBy, filters) {
  return {
    ...scope,
    grouped: 1,
    page,
    page_size: PAGE_SIZE,
    ordering: ORDERINGS[sortBy],
    categories: filters.category,
    brands: filters.brand,
    price: filters.price,
    eco: filters.vikingSelection.includes('eco') ? 1 : '',
    bestprice: filters.vikingSelection.includes('bestPrice') ? 1 : '',
    available: filters.availability.includes('available') ? 1 : '',
  }
}

const asResult = (data, scopeKey) => ({ ...data, results: data.results.map(normalizeProduct), scopeKey })

// Only used if the category list itself failed to load: "office-supplies" -> "Office Supplies".
const slugToWords = slug => slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/**
 * Product listing for:
 *   /category            all products
 *   /category/:slug      one category (looked up in the live category list)
 *   /search?q=…&brand=…  search results
 *
 * Filtering, sorting and paging happen on the server, so they cover the whole
 * catalog. The page number lives in the URL (?page=2).
 *
 * Products always come from the API. There is no mock fallback: empty results,
 * unknown categories and failed requests each get their own message.
 */
export default function ListingPage({ mode }) {
  const { slug, subcat } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const isSearch = mode === 'search'
  const query = isSearch ? (searchParams.get('q') || '').trim() : ''
  const brand = isSearch ? (searchParams.get('brand') || '').trim() : ''

  const { categories, getBySlug, loading: categoriesLoading, error: categoriesError, reload: reloadCategories } = useCategories()
  const { settings } = useSiteSettings()
  const category = slug ? getBySlug(slug) : null

  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)
  // Filters belong to one listing; moving to another starts clean.
  const scopeKey = JSON.stringify([isSearch, slug || '', query, brand])

  const scope = isSearch ? { search: query, brand } : { slug }
  // Start from a remembered answer (e.g. coming back) so there's no flash.
  const [initial] = useState(() => peekProducts(buildQuery(scope, page, 'popular', EMPTY_FILTERS)))
  const [result, setResult] = useState(() => initial ? asResult(initial, scopeKey) : EMPTY_RESULT)
  const [facets, setFacets] = useState(() => peekFacets({ ...scope, grouped: 1 }) || null)
  const [status, setStatus] = useState(initial ? 'ready' : 'loading') // loading | ready | error
  const [reloadKey, setReloadKey] = useState(0)
  const [filterState, setFilterState] = useState({ scopeKey, filters: EMPTY_FILTERS })
  const activeFilters = filterState.scopeKey === scopeKey ? filterState.filters : EMPTY_FILTERS
  const [sortBy, setSortBy] = useState('popular')
  const [viewMode, setViewMode] = useState('grid')  // 'grid' | 'list'
  const [gridCols, setGridCols] = useState(3)        // 2, 3, or 4
  const [showGridMenu, setShowGridMenu] = useState(false)

  const noSearchTerm = isSearch && !query && !brand

  // Sidebar options and counts for the whole listing.
  useEffect(() => {
    let cancelled = false
    setFacets(peekFacets({ ...scope, grouped: 1 }) || null)
    if (noSearchTerm) return
    fetchProductFacets({ ...scope, grouped: 1 })
      .then(data => { if (!cancelled) setFacets(data) })
      .catch(() => {}) // the product request below reports errors
    return () => { cancelled = true }
  }, [scopeKey, reloadKey])

  // One page of products.
  useEffect(() => {
    let cancelled = false
    if (noSearchTerm) {
      setResult(EMPTY_RESULT)
      setStatus('ready')
      return
    }

    const params = buildQuery(scope, page, sortBy, activeFilters)
    const remembered = peekProducts(params)
    if (remembered) setResult(asResult(remembered, scopeKey))
    setStatus(remembered ? 'ready' : 'loading')

    fetchProducts(params)
      .then(data => {
        if (cancelled) return
        setResult(asResult(data, scopeKey))
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setResult(EMPTY_RESULT)
        setStatus('error')
      })

    return () => { cancelled = true }
  }, [scopeKey, page, sortBy, activeFilters, reloadKey])

  const goToPage = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next > 1) params.set('page', next)
    else params.delete('page')
    setSearchParams(params)
    window.scrollTo({ top: 0 })
  }

  /** Changing a filter or the sort order goes back to page 1. */
  const resetPage = () => {
    if (!searchParams.has('page')) return
    const params = new URLSearchParams(searchParams)
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  const setFilters = (filters) => {
    setFilterState({ scopeKey, filters })
    resetPage()
  }

  // A category created in another tab may not be in our list yet: refresh once.
  const refreshedFor = useRef(null)
  useEffect(() => {
    if (slug && !categoriesLoading && !category && refreshedFor.current !== slug) {
      refreshedFor.current = slug
      reloadCategories()
    }
  }, [slug, categoriesLoading, category, reloadCategories])

  const handleFilterChange = (filterKey, value) => {
    if (filterKey === '__clear__') {
      setFilters(EMPTY_FILTERS)
      return
    }
    const current = activeFilters[filterKey] || []
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    setFilters({ ...activeFilters, [filterKey]: updated })
  }

  const hasFilters = Object.values(activeFilters).some(v => v.length > 0)
  const total = facets?.total ?? result.count
  // Truly empty listing (as opposed to filters that match nothing).
  const listingEmpty = result.count === 0 && !hasFilters

  // Full placeholders only when there is nothing relevant to keep on screen.
  const showSkeleton = status === 'loading' && result.scopeKey !== scopeKey
  const refreshing = status === 'loading' && !showSkeleton
  const showContent = !showSkeleton && status !== 'error'

  // Main category of the one being shown, when it is a subcategory.
  const parent = category?.parent ? categories.find(c => c.id === category.parent) : null

  // /category/:slug/:subcat links open the subcategory page.
  if (subcat) return <Navigate to={`/category/${subcat}`} replace />

  const categoryMissing = !!slug && !categoriesLoading && !categoriesError && !category
  if (categoryMissing && status === 'ready' && result.count === 0) {
    return (
      <div className="bg-[#F5F5F5] min-h-screen pb-12">
        <div className="max-w-[1200px] mx-auto px-4 pt-6">
          <div className="bg-white">
            <StateMessage
              title="Category not found"
              message="This category doesn't exist or is no longer available."
            >
              <Link to="/category" className="mt-4 text-[13px] text-[#0066CC] hover:underline">Browse all products</Link>
            </StateMessage>
          </div>
        </div>
      </div>
    )
  }

  let pageTitle
  if (isSearch) pageTitle = query ? `Results for "${query}"` : (brand || 'Search')
  else if (slug) pageTitle = category?.name || (categoriesError ? slugToWords(slug) : '')
  else pageTitle = 'All Products'

  const crumbLabel = isSearch ? 'Search results' : slug ? pageTitle : 'All Products'

  let emptyState
  if (isSearch && !query && !brand) {
    emptyState = { title: 'Search for products', message: 'Enter a product name, SKU, brand or category in the search box above.' }
  } else if (isSearch) {
    emptyState = { title: 'No products found', message: query ? `No products match "${query}".` : `No products found for ${brand}.` }
  } else if (slug) {
    emptyState = { title: 'No products available in this category.', message: 'Please check back soon.' }
  } else {
    emptyState = { title: 'No products available yet.', message: 'Please check back soon.' }
  }

  // Free-gifts banner is admin content (Storefront UI → Free Gifts Banner); hidden until configured.
  const giftImages = Array.isArray(settings?.free_gifts_banner)
    ? settings.free_gifts_banner.filter(img => img?.src).slice(0, 3)
    : []

  // A listing with exactly one product gets the wide "spotlight" layout.
  const solo = showContent && !hasFilters && result.count === 1 && result.results.length === 1
    ? result.results[0] : null

  // ── Banner content, all from the catalog ──
  const mainCategory = parent || category
  const chips = (mainCategory ? categories.filter(c => c.parent === mainCategory.id) : categories.filter(c => !c.parent))
    .filter(c => c.slug && c.productCount > 0)
    .map(c => ({ to: `/category/${c.slug}`, label: c.name, active: c.slug === slug }))
  if (mainCategory && chips.length > 0) {
    chips.unshift({ to: `/category/${mainCategory.slug}`, label: `All ${mainCategory.name}`, active: mainCategory.slug === slug })
  }
  const countText = showContent && total > 0 ? `${total} product${total === 1 ? '' : 's'}` : ''
  const childNames = category && !parent ? categories.filter(c => c.parent === category.id).map(c => c.name) : []
  const summary = [countText, childNames.join(', ')].filter(Boolean).join(' · ')
  const bannerImage = category?.image || (result.scopeKey === scopeKey ? getProductImage(result.results[0]) : null)

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="bg-white pt-3 pb-2 border-b-0">
        <div className="max-w-[1200px] mx-auto px-4">
          <nav className="text-[12px] text-gray-500 whitespace-nowrap overflow-x-auto">
            <ol className="flex items-center gap-1.5 min-w-max">
              <li><Link to="/home" className="hover:underline">Home</Link></li>
              {parent && (
                <>
                  <li>›</li>
                  <li><Link to={`/category/${parent.slug}`} className="hover:underline">{parent.name}</Link></li>
                </>
              )}
              {crumbLabel && (
                <>
                  <li>›</li>
                  <li className="text-gray-900">{crumbLabel}</li>
                </>
              )}
            </ol>
          </nav>
        </div>
      </div>

      <div className="bg-white">
        <div className="max-w-[1200px] mx-auto px-4 pt-4 pb-6">

          {!isSearch && (
            <CategoryBanner
              eyebrow={parent ? parent.name : slug ? 'Category' : 'Catalog'}
              title={pageTitle}
              summary={summary}
              image={bannerImage}
              chips={chips}
            />
          )}

          {/* Header Row: search title, and sorting when there is something to sort */}
          <div className={`flex-col md:flex-row md:items-center justify-between mb-4 ${isSearch || !solo ? 'flex' : 'hidden'}`}>
            <div className="flex items-center gap-3">
              {isSearch ? (
                <h1 className="text-[26px] font-bold text-gray-800 min-h-[39px]">
                  {pageTitle}{' '}
                  {showContent && (
                    <span className="text-[18px] text-gray-500 font-normal">
                      ({result.count}{hasFilters && total !== result.count ? ` of ${total}` : ''})
                    </span>
                  )}
                </h1>
              ) : (
                <p className="text-[13px] text-gray-500 min-h-[20px]">
                  {showContent && `Showing ${result.count}${hasFilters && total !== result.count ? ` of ${total}` : ''} product${(hasFilters ? total : result.count) === 1 ? '' : 's'}`}
                </p>
              )}
            </div>

            <div className={`items-center gap-6 mt-4 md:mt-0 ${solo ? 'hidden' : 'flex'}`}>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-gray-600 font-semibold">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value); resetPage() }}
                  className="border border-gray-300 rounded-sm text-[13px] py-1.5 px-2 outline-none focus:border-[#0066CC] w-[160px] shadow-sm"
                >
                  <option value="popular">Most popular</option>
                  <option value="priceLow">Price (Low to High)</option>
                  <option value="priceHigh">Price (High to Low)</option>
                </select>
              </div>

              {/* Grid / List view toggle */}
              <div className="hidden md:flex items-center gap-2 relative">
                {/* List view button */}
                <button
                  onClick={() => setViewMode('list')}
                  title="List view"
                  className={`p-1.5 rounded-sm border transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#0066CC] border-[#0066CC] text-white'
                      : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="3" cy="6" r="1" fill="currentColor" /><circle cx="3" cy="12" r="1" fill="currentColor" /><circle cx="3" cy="18" r="1" fill="currentColor" />
                  </svg>
                </button>

                {/* Grid view button with dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setViewMode('grid'); setShowGridMenu(v => !v) }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-[#0066CC] border-[#0066CC] text-white'
                        : 'bg-gray-100 border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                    <span className="text-[13px] font-semibold">{gridCols} col</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {showGridMenu && viewMode === 'grid' && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-30 py-1 min-w-[100px]">
                      {[2, 3, 4].map(n => (
                        <button
                          key={n}
                          onClick={() => { setGridCols(n); setShowGridMenu(false) }}
                          className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-gray-50 ${
                            gridCols === n ? 'font-bold text-[#0066CC]' : 'text-gray-700'
                          }`}
                        >
                          {n} columns
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout Area */}
          <div className="flex gap-6 items-start">
            {!solo && (
              <ListingSidebar
                facets={facets}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
              />
            )}

            {/* Product Grid Area */}
            <div className="flex-1">

              {/* Free Gifts Banner (admin-managed content) */}
              {giftImages.length > 0 && (
                <div className="w-full h-[120px] bg-indigo-50 border border-indigo-100 rounded-sm flex items-center mb-6 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#D6D0F2] via-[#E1BCE8] to-[#F1B9C7] opacity-90 z-0"></div>
                  <div className="absolute left-10 z-10">
                    <h2 className="text-[32px] font-black text-gray-900 leading-none mb-1">FREE gifts</h2>
                    <h3 className="text-[28px] font-bold text-gray-800 leading-none">for you</h3>
                  </div>
                  <div className="absolute right-10 flex gap-4 z-10 bottom-2">
                    {giftImages.map((img, i) => (
                      <img key={i} src={img.src} className="w-[100px] h-[100px] object-contain drop-shadow-xl" alt={img.alt || 'Gift'} onError={(e) => { e.target.style.display = 'none' }} />
                    ))}
                  </div>
                </div>
              )}

              {showSkeleton && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-sm p-4">
                      <div className="h-[160px] skeleton rounded mb-4"></div>
                      <div className="h-4 skeleton rounded w-3/4 mb-2"></div>
                      <div className="h-6 skeleton rounded w-1/2 mb-2"></div>
                      <div className="h-20 skeleton rounded mb-2"></div>
                    </div>
                  ))}
                </div>
              )}

              {status === 'error' && (
                <StateMessage
                  variant="error"
                  title="We couldn't load products"
                  message="Please check your connection and try again."
                  onRetry={() => setReloadKey(k => k + 1)}
                />
              )}

              {showContent && listingEmpty && (
                <StateMessage title={emptyState.title} message={emptyState.message} />
              )}

              {showContent && !listingEmpty && (
                <div className={`refreshable soft-in ${refreshing ? 'refreshing' : ''}`} aria-busy={refreshing}>
                  {result.results.length === 0 ? (
                    <div className="py-16 text-center text-gray-500">
                      <p className="text-[15px] font-semibold mb-2">No products match your filters</p>
                      <button
                        onClick={() => setFilters(EMPTY_FILTERS)}
                        className="text-[13px] text-[#0066CC] hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  ) : solo ? (
                    <ProductSpotlight key={solo.id} product={solo} />
                  ) : viewMode === 'list' ? (
                    <div className="flex flex-col divide-y divide-gray-200 border border-gray-200 bg-white">
                      {result.results.map(product => (
                        <ListingProductCard key={product.id} product={product} viewMode="list" />
                      ))}
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${
                      gridCols === 2 ? 'grid-cols-1 md:grid-cols-2' :
                      gridCols === 4 ? 'grid-cols-2 md:grid-cols-4' :
                      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    }`}>
                      {result.results.map(product => (
                        <ListingProductCard key={product.id} product={product} viewMode="grid" />
                      ))}
                    </div>
                  )}
                  <Pagination page={result.page} totalPages={result.totalPages} onChange={goToPage} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showContent && result.results.length > 0 && (
        <MoreToExplore parent={mainCategory} shownIds={result.results.map(p => p.id)} />
      )}
    </div>
  )
}
