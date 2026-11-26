import { useState, useEffect, useCallback } from 'react'
import ProductCard from './ProductCard'
import StateMessage from './StateMessage'
import { fetchProducts } from '../api'
import { normalizeProduct } from '../utils/product'
import { useSiteSettings } from '../context/SettingsContext'
import { getHeadings } from '../utils/storeSettings'

const ROW_LIMIT = 8

/**
 * Homepage product rows. Each row is a real API query:
 *   - admin-curated rows use the product's "Display section"
 *   - New Arrivals = the most recently added products
 * Rows with no products are hidden; if nothing loads, the section is hidden.
 * Row headings are set in Admin → Store Settings.
 */
const ROWS = [
  { key: 'viewed', params: { section: 'viewed', limit: ROW_LIMIT } },
  { key: 'bought', params: { section: 'bought', limit: ROW_LIMIT } },
  { key: 'recommendation', params: { section: 'recommendation', limit: ROW_LIMIT } },
  { key: 'newest', params: { ordering: 'newest', limit: ROW_LIMIT } },
]

// Last rows shown, so returning to the homepage is instant.
let savedRows = null

export default function ProductGrid() {
  const { settings } = useSiteSettings()
  const headings = getHeadings(settings)
  const [rows, setRows] = useState(savedRows || {})
  const [status, setStatus] = useState(savedRows ? 'ready' : 'loading') // loading | ready | error

  const load = useCallback(async () => {
    if (!savedRows) setStatus('loading')
    try {
      const results = await Promise.all(ROWS.map(row => fetchProducts({ ...row.params, grouped: 1 })))
      const next = {}
      ROWS.forEach((row, i) => { next[row.key] = (results[i] || []).map(normalizeProduct) })
      savedRows = next
      setRows(next)
      setStatus('ready')
    } catch {
      if (!savedRows) setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (status === 'loading') {
    return (
      <section className="bg-white py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="animate-pulse space-y-4" aria-busy="true">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[300px] bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="bg-white py-4">
        <div className="max-w-[1200px] mx-auto px-4">
          <StateMessage
            variant="error"
            title="We couldn't load products"
            message="Please check your connection and try again."
            onRetry={load}
            className="py-8"
          />
        </div>
      </section>
    )
  }

  const visibleRows = ROWS.filter(row => rows[row.key]?.length > 0)
  if (visibleRows.length === 0) return null

  return (
    <section className="bg-white py-8 soft-in">
      <div className="max-w-[1200px] mx-auto px-4">
        {visibleRows.map((row, i) => (
          <div key={row.key} className={i < visibleRows.length - 1 ? 'mb-10' : ''}>
            {headings[row.key] && (
              <h2 className="text-[16px] font-bold text-gray-800 mb-5 pb-2 border-b border-gray-200">
                {headings[row.key]}
              </h2>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {rows[row.key].map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
