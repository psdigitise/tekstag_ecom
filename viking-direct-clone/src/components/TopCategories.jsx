import { useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from './SectionHeading'
import { SkeletonCircles } from './Loaders'
import { useCategories } from '../context/CategoriesContext'
import { formatPrice } from '../utils/product'
import { useSiteSettings } from '../context/SettingsContext'
import { getHeadings } from '../utils/storeSettings'

/** "From" line under a category circle: the admin's text if set, else the real lowest price. */
function fromPriceLabel(category) {
  if (category.fromPrice) return category.fromPrice
  const min = formatPrice(category.minPrice)
  return min ? `From ${min}` : null
}

function CategoryCircle({ category }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = category.image && !imgFailed
  const priceLabel = fromPriceLabel(category)

  return (
    <Link
      to={`/category/${category.slug}`}
      className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0"
    >
      <div
        className="w-[110px] h-[110px] rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-[#D52B1E] transition-all duration-200 group-hover:shadow-lg flex items-center justify-center"
        style={{ backgroundColor: category.fallbackColor || '#F3F4F6' }}
      >
        {showImage ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-[32px] font-bold text-gray-500" aria-hidden="true">
            {category.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-[12px] font-semibold text-gray-800 group-hover:text-[#D52B1E] transition-colors leading-tight max-w-[110px] text-center">
          {category.name}
        </p>
        {priceLabel && <p className="text-[11px] text-gray-500 mt-0.5">{priceLabel}</p>}
      </div>
    </Link>
  )
}

/** Homepage category circles — every category from the API. Hidden when there are none. */
export default function TopCategories() {
  const { categories, loading } = useCategories()
  const { settings } = useSiteSettings()
  const visible = categories.filter(c => c.slug && !c.parent)

  if (loading) return <div className="py-8"><SkeletonCircles count={3} size="w-[110px] h-[110px]" /></div>
  if (visible.length === 0) return null

  return (
    <section className="bg-white py-8 soft-in">
      <div className="max-w-[1200px] mx-auto px-4">
        <SectionHeading>{getHeadings(settings).categories}</SectionHeading>
        <div className="flex flex-wrap items-start justify-center gap-x-14 gap-y-6">
          {visible.map((cat) => (
            <CategoryCircle key={cat.id} category={cat} />
          ))}
        </div>
      </div>
    </section>
  )
}
