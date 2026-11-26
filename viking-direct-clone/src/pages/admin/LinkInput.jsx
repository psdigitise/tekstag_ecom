import { useState, useEffect } from 'react'
import { fetchProducts } from '../../api'
import { useCategories } from '../../context/CategoriesContext'
import { categoryLabel } from '../../utils/product'

const CUSTOM = '__custom__'
const FIELD = 'w-full border border-gray-300 p-2 text-sm rounded bg-white outline-none focus:border-[#00857C]'

// Every link field on the page shares one product request.
let productsRequest = null
let requestedAt = 0
function loadProducts() {
  if (!productsRequest || Date.now() - requestedAt > 30_000) {
    requestedAt = Date.now()
    productsRequest = fetchProducts({ grouped: 1, ordering: 'name' })
      .catch(err => { productsRequest = null; throw err })
  }
  return productsRequest
}

/** "Where should this go?" — pick a category or product by name instead of typing a path. */
export default function LinkInput({ value, onChange }) {
  const { categories } = useCategories()
  const [products, setProducts] = useState([])
  const [customChosen, setCustomChosen] = useState(false)

  useEffect(() => {
    loadProducts().then(setProducts).catch(console.error)
  }, [])

  const groups = [
    { label: 'Pages', options: [{ value: '/category', label: 'All products' }] },
    { label: 'Categories', options: categories.filter(c => c.slug).map(c => ({ value: `/category/${c.slug}`, label: categoryLabel(c, categories) })) },
    { label: 'Products', options: products.map(p => ({ value: `/product/${p.id}`, label: p.name })) },
  ]
  const known = groups.some(g => g.options.some(o => o.value === value))
  const custom = customChosen || (!!value && !known)

  return (
    <div data-testid="link-input">
      <select
        value={custom ? CUSTOM : (value || '')}
        onChange={e => {
          const next = e.target.value
          setCustomChosen(next === CUSTOM)
          if (next !== CUSTOM) onChange(next)
        }}
        className={FIELD}
      >
        <option value="">No link</option>
        {groups.map(g => g.options.length > 0 && (
          <optgroup key={g.label} label={g.label}>
            {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        ))}
        <option value={CUSTOM}>Custom link…</option>
      </select>
      {custom && (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://… or /search?q=film" aria-label="Custom link" className={`${FIELD} mt-2`} />
      )}
    </div>
  )
}
