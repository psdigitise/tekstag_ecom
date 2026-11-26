import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchBrands } from '../api'
import { useSiteSettings } from '../context/SettingsContext'
import { getHeadings } from '../utils/storeSettings'

/**
 * Brand strip. Brands come from GET /api/brands/ (the client's Brands sheet:
 * name + colour). Each brand opens the search page filtered to that brand's
 * products. Hidden when there are no brands.
 */
export default function PopularBrands() {
  const [brands, setBrands] = useState([])
  const { settings } = useSiteSettings()
  const heading = getHeadings(settings).brands

  useEffect(() => {
    fetchBrands()
      .then(data => setBrands(Array.isArray(data) ? data.filter(b => b?.name) : []))
      .catch(console.error)
  }, [])

  // A "popular brands" strip needs more than one brand to be meaningful.
  if (brands.length < 2) return null

  return (
    <section className="bg-white py-8 border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto px-4">
        {heading && (
          <h2 className="text-center text-sm font-bold text-gray-700 tracking-[0.15em] uppercase mb-6">
            {heading}
          </h2>
        )}
        <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/search?brand=${encodeURIComponent(brand.name)}`}
              className="flex items-center justify-center group hover:opacity-70 transition-opacity px-4"
            >
              <span
                style={{ color: brand.color || '#374151' }}
                className="font-sans font-black text-[20px]"
              >
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
