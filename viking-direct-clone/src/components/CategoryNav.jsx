import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCategories } from '../context/CategoriesContext'
import { fetchProducts } from '../api'

// How many product links the hover menu shows for a category.
const MENU_PRODUCT_LIMIT = 12

/**
 * Main category bar + hover menu.
 *
 * Categories come from the API (CategoriesContext), so any category the admin
 * creates appears here. The backend has no subcategories, so the hover menu
 * lists real products from that category (loaded on first hover, then cached)
 * instead of the old hardcoded subcategory groups.
 */
export default function CategoryNav() {
  const { categories } = useCategories()
  const [activeSlug, setActiveSlug] = useState(null)
  const [menuProducts, setMenuProducts] = useState({}) // slug -> { status, items }
  const leaveTimer = useRef(null)

  // When the category list reloads (admin change, tab refocus), drop cached menus too.
  useEffect(() => { setMenuProducts({}) }, [categories])

  const loadMenuProducts = (slug) => {
    if (menuProducts[slug]) return
    setMenuProducts(prev => ({ ...prev, [slug]: { status: 'loading', items: [] } }))
    fetchProducts({ slug, grouped: 1, limit: MENU_PRODUCT_LIMIT, ordering: 'popular' })
      .then(items => setMenuProducts(prev => ({ ...prev, [slug]: { status: 'ready', items } })))
      .catch(() => setMenuProducts(prev => ({ ...prev, [slug]: { status: 'error', items: [] } })))
  }

  const handleMouseEnter = (slug) => {
    clearTimeout(leaveTimer.current)
    setActiveSlug(slug)
    loadMenuProducts(slug)
  }

  const handleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setActiveSlug(null), 120)
  }

  const activeCat = categories.find(c => c.slug === activeSlug)
  const activeMenu = activeSlug ? menuProducts[activeSlug] : null
  const subcategories = activeCat ? categories.filter(c => c.parent === activeCat.id) : []

  return (
    <nav className="bg-white border-b border-gray-200 relative z-40">
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Main categories row — live from the API */}
        <div className="flex items-center overflow-x-auto scrollbar-hide border-b border-gray-100 min-h-[42px]">
          {categories.filter(cat => cat.slug && !cat.parent).map(cat => (
            <div
              key={cat.id}
              className="relative flex-shrink-0 first:-ml-3"
              onMouseEnter={() => handleMouseEnter(cat.slug)}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                to={`/category/${cat.slug}`}
                onClick={() => setActiveSlug(null)}
                className={`relative flex-shrink-0 text-[12px] font-normal px-3 py-3 whitespace-nowrap transition-colors duration-150 border-b-2 block ${
                  activeSlug === cat.slug
                    ? 'text-[#D52B1E] border-[#D52B1E]'
                    : 'text-gray-700 border-transparent hover:text-gray-900'
                }`}
              >
                {cat.name}
              </Link>
            </div>
          ))}
        </div>

      </div>

      {/* Hover menu: real products from the hovered category */}
      {activeCat && (
        <div
          className="absolute left-0 right-0 bg-white border-t border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50"
          onMouseEnter={() => handleMouseEnter(activeCat.slug)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="max-w-[1200px] mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
              <h3 className="text-[13px] font-bold text-gray-900">{activeCat.name}</h3>
              <Link
                to={`/category/${activeCat.slug}`}
                onClick={() => setActiveSlug(null)}
                className="text-[12px] text-[#0066CC] hover:underline font-medium"
              >
                See all{activeCat.productCount ? ` ${activeCat.productCount} products` : ''} ›
              </Link>
            </div>

            {subcategories.length > 0 && (
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5">
                {subcategories.map(sub => (
                  <li key={sub.id}>
                    <Link
                      to={`/category/${sub.slug}`}
                      onClick={() => setActiveSlug(null)}
                      className="text-[13px] font-semibold text-gray-700 hover:text-[#D52B1E] transition-colors block leading-snug"
                    >
                      {sub.name} <span className="font-normal text-gray-400">({sub.productCount})</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {subcategories.length === 0 && (<>
            {(!activeMenu || activeMenu.status === 'loading') && (
              <div className="grid grid-cols-4 gap-x-6 gap-y-2 animate-pulse">
                {[...Array(8)].map((_, i) => <div key={i} className="h-3 bg-gray-100 rounded w-3/4" />)}
              </div>
            )}
            {activeMenu?.status === 'error' && (
              <p className="text-[12px] text-gray-500">Products couldn't be loaded right now.</p>
            )}
            {activeMenu?.status === 'ready' && activeMenu.items.length === 0 && (
              <p className="text-[12px] text-gray-500">No products available in this category yet.</p>
            )}
            {activeMenu?.status === 'ready' && activeMenu.items.length > 0 && (
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5">
                {activeMenu.items.map(p => (
                  <li key={p.id}>
                    <Link
                      to={`/product/${p.id}`}
                      onClick={() => setActiveSlug(null)}
                      className="text-[12px] text-gray-600 hover:text-[#D52B1E] transition-colors block leading-snug line-clamp-1"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            </>)}
          </div>
        </div>
      )}
    </nav>
  )
}
