import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../ProductCard'
import { fetchProducts } from '../../api'
import { normalizeProduct } from '../../utils/product'

const LIMIT = 4

/**
 * Other products below a listing. Looks in the surrounding category first, then
 * fills up from the rest of the catalog. Never repeats what is already shown.
 */
export default function MoreToExplore({ parent, shownIds }) {
  const [items, setItems] = useState([])
  const key = shownIds.join(',')

  useEffect(() => {
    let cancelled = false
    const query = { grouped: 1, ordering: 'popular', limit: 40 }
    Promise.all([
      parent ? fetchProducts({ ...query, slug: parent.slug }) : Promise.resolve([]),
      fetchProducts(query),
    ])
      .then(([related, all]) => {
        if (cancelled) return
        const seen = new Set(shownIds)
        const next = []
        for (const product of [...related, ...all]) {
          if (seen.has(product.id) || next.length === LIMIT) continue
          seen.add(product.id)
          next.push(normalizeProduct(product))
        }
        setItems(next)
      })
      .catch(() => { if (!cancelled) setItems([]) }) // an optional section
    return () => { cancelled = true }
  }, [parent?.slug, key])

  if (items.length === 0) return null

  return (
    <section className="bg-[#F6F7F9] border-t border-gray-200 py-10 soft-in">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[20px] font-black text-gray-900">You may also like</h2>
            <span className="block w-10 h-[3px] bg-[#D52B1E] mt-2" />
          </div>
          <Link to="/category" className="text-[13px] font-bold text-[#0066CC] hover:underline">View all products ›</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </section>
  )
}
