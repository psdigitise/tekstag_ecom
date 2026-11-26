import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getRecentlyViewed } from '../utils/storage'
import { fetchProducts } from '../api'
import ProductImage from './ProductImage'
import { formatPrice, getProductImage } from '../utils/product'
import { useSiteSettings } from '../context/SettingsContext'
import { getStoreText, TEXT_DEFAULTS } from '../utils/storeSettings'

// Number of live results shown in the search dropdown.
const SEARCH_DROPDOWN_LIMIT = 6

export default function Navbar() {
  const [query, setQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [recentProducts, setRecentProducts] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [accountHover, setAccountHover] = useState(false)
  
  const searchRef = useRef(null)
  const { totalItems } = useCart()
  const { user, isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = useSiteSettings()
  const { storeName, logo } = getStoreText(settings)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setSearchFocused(false)
    setQuery('')
  }, [location.pathname])

  // Fetch search results with debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      setSearchError(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true)
      setSearchError(false)
      try {
        const data = await fetchProducts({ search: query.trim(), grouped: 1, ordering: 'popular', limit: SEARCH_DROPDOWN_LIMIT })
        setSearchResults(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Search error:', err)
        setSearchResults([])
        setSearchError(true)
      } finally {
        setLoadingSearch(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  // Load recently viewed when focused
  const handleFocus = () => {
    setRecentProducts(getRecentlyViewed())
    setSearchFocused(true)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      // Full results page (ListingPage in search mode). It used to point at
      // /category/search, which was treated as a category slug and always empty.
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setSearchFocused(false)
    }
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-md bg-white' : 'bg-white border-b border-gray-200'
      }`}
    >
      {/* On phones the search box takes its own row under the logo and icons. */}
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-x-6 gap-y-2">

        {/* Logo */}
        {/* In-app link: a full page load would empty the basket. */}
        <Link
          to="/home"
          className="flex-shrink-0"
          style={{
            fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
            fontWeight: 900,
            fontSize: '34px',
            color: '#000',
            letterSpacing: '-0.5px',
            lineHeight: 1,
            textDecoration: 'none',
          }}
        >
          {logo
            ? <img src={logo} alt={storeName || TEXT_DEFAULTS.storeName} className="h-10 w-auto max-w-[200px] object-contain" />
            : (storeName || TEXT_DEFAULTS.storeName)}
        </Link>

        {/* Search */}
        <div className="order-last basis-full sm:order-none sm:basis-0 sm:flex-1 min-w-0 relative" ref={searchRef}>
          <form 
            onSubmit={handleSearchSubmit}
            className={`flex items-center rounded border transition-all duration-200 ${
              searchFocused
                ? 'border-[#0066CC] shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                : 'border-gray-300 hover:border-gray-400'
            } bg-white relative z-50`}
          >
            <button type="submit" className="pl-3 pr-2 py-2.5 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={handleFocus}
              placeholder="What are you looking for?"
              className="flex-1 min-w-0 py-2.5 pr-3 text-[14px] text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="pr-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </form>

          {/* Search Dropdown */}
          {searchFocused && (
            <div className="absolute top-full left-0 right-0 mt-0 bg-white border border-gray-200 border-t-0 rounded-b shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
              
              {/* Recently Viewed */}
              {!query.trim() && Array.isArray(recentProducts) && recentProducts.length > 0 && (
                <div className="p-4">
                  <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recently Viewed</h3>
                  <div className="grid grid-cols-1 gap-1">
                    {recentProducts.map(p => (
                      <Link 
                        key={p.id} 
                        to={`/product/${p.id}`}
                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors group"
                      >
                        <div className="w-10 h-10 border border-gray-100 rounded bg-white flex items-center justify-center p-1 flex-shrink-0">
                          <ProductImage src={p.image} alt="" className="max-w-full max-h-full object-contain" placeholderClassName="w-full h-full [&>span]:hidden" iconSize={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-800 font-medium truncate group-hover:text-[#0066CC]">{p.name}</p>
                          {p.category && <p className="text-[11px] text-gray-500">{p.category}</p>}
                        </div>
                        {formatPrice(p.priceExVat || p.price) && (
                          <div className="text-[13px] font-bold text-gray-900">{formatPrice(p.priceExVat || p.price)}</div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Search Results */}
              {query.trim().length >= 2 && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                    <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Top Results</h3>
                    {loadingSearch && <div className="w-4 h-4 border-2 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>}
                  </div>
                  
                  {Array.isArray(searchResults) && searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.slice(0, SEARCH_DROPDOWN_LIMIT).map(p => (
                        <Link
                          key={p.id}
                          to={`/product/${p.id}`}
                          className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-12 h-12 border border-gray-100 rounded bg-white flex items-center justify-center p-1 flex-shrink-0">
                            <ProductImage src={getProductImage(p)} alt="" className="max-w-full max-h-full object-contain" placeholderClassName="w-full h-full [&>span]:hidden" iconSize={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-gray-800 font-bold truncate group-hover:text-[#0066CC]">{p.name}{p.variantCount > 1 ? ` (${p.variantCount} sizes)` : p.size ? ` (${p.size})` : ''}</p>
                            {(p.brandName || p.category?.name) && (
                              <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-tighter">{p.brandName || p.category?.name}</p>
                            )}
                          </div>
                          {formatPrice(p.priceExVat) && (
                            <div className="text-right flex-shrink-0">
                              <div className="text-[14px] font-black text-gray-900">{formatPrice(p.priceExVat)}</div>
                              <div className="text-[10px] text-gray-400">excl. VAT</div>
                            </div>
                          )}
                        </Link>
                      ))}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <button 
                          onClick={handleSearchSubmit}
                          className="w-full text-center py-2 text-[13px] font-bold text-[#0066CC] hover:bg-[#0066CC]/5 rounded transition-colors"
                        >
                          View all results for "{query}"
                        </button>
                      </div>
                    </div>
                  ) : loadingSearch ? null : searchError ? (
                    <div className="py-8 text-center">
                      <p className="text-[14px] text-gray-500">Search is unavailable right now. Please try again.</p>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-[14px] text-gray-500">No products found for "{query}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state when query is too short but focused */}
              {query.trim().length > 0 && query.trim().length < 2 && searchFocused && (
                <div className="p-6 text-center">
                  <p className="text-[13px] text-gray-400 italic">Continue typing to search...</p>
                </div>
              )}
              
              {!query.trim() && recentProducts.length === 0 && (
                <div className="p-6 text-center">
                  <div className="mb-2 text-gray-300">
                    <svg className="mx-auto" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-gray-500">Search for products, categories or brands</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account + Icons */}
        {/* -mr-2 lines the last icon up with the right edge of the page content. */}
        <div className="flex items-center gap-1 flex-shrink-0 -mr-2 ml-auto sm:ml-0">
          
          {/* Account Dropdown Wrapper */}
          <div 
            className="hidden md:block relative group"
            onMouseEnter={() => setAccountHover(true)}
            onMouseLeave={() => setAccountHover(false)}
          >
            <div className="flex items-center cursor-pointer py-2">
              <div className="flex flex-col mr-2 text-right">
                {isLoggedIn ? (
                  <>
                    <span className="text-[13px] font-black text-gray-900 leading-tight">Hi, {user?.name || user?.firstName || 'User'}</span>
                    <span className="text-[11px] text-[#00857C] font-semibold flex items-center justify-end gap-1">My account <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M6 9l6 6 6-6"/></svg></span>
                  </>
                ) : (
                  <>
                    <span className="text-[13px] font-black text-gray-900 leading-tight">My account</span>
                    <div className="text-[11px] text-[#00857C] font-semibold flex items-center justify-end gap-1">Sign in <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M6 9l6 6 6-6"/></svg></div>
                  </>
                )}
              </div>
              <div className="p-2 text-gray-600 group-hover:text-[#D52B1E] transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>

            {/* Account Dropdown Menu */}
            <div className={`absolute top-full right-0 w-[240px] bg-white border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.12)] rounded-lg py-3 z-[60] transition-all duration-200 origin-top-right ${
              accountHover ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
            }`}>
              {isLoggedIn ? (
                <div className="px-4 pb-3 border-b border-gray-100 mb-2">
                   <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Signed in as</p>
                   <p className="text-[14px] font-black text-gray-900 truncate">{user?.email}</p>
                </div>
              ) : (
                <div className="px-4 pb-3 border-b border-gray-100 mb-2">
                   <Link to="/login" className="block w-full text-center bg-[#D52B1E] hover:bg-[#B12016] text-white font-bold py-2 rounded text-[13px] transition-colors mb-2">
                     Sign In or Register
                   </Link>
                </div>
              )}

              <div className="space-y-0.5">
                {[
                  { label: 'My Account', path: '/account' },
                  { label: 'Order History', path: '/account/orders' },
                  { label: 'Shopping Lists', path: '/account/lists' },
                  { label: 'Addresses', path: '/account/addresses' },
                  { label: 'Payment Methods', path: '/account/payments' },
                ].map((item) => (
                  <Link 
                    key={item.label}
                    to={item.path} 
                    className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-[#F8FAFC] hover:text-[#D52B1E] font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {isLoggedIn && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 font-bold transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          <Link to="/account/lists" aria-label="Shopping lists" className="p-2 text-gray-600 hover:text-[#D52B1E] transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0L12 5.36l-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.78.77L12 20.64l7.64-7.63.78-.78a5.4 5.4 0 0 0 0-7.65z" />
            </svg>
          </Link>

          <Link to="/cart" className="relative p-2 text-gray-600 hover:text-[#D52B1E] transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#0066CC] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
