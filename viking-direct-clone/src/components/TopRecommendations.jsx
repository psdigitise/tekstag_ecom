import { useState } from 'react'
import SectionHeading from './SectionHeading'
import { SkeletonCircles } from './Loaders'
import ContentLink from './ContentLink'
import { useSiteSettings } from '../context/SettingsContext'
import { getHeadings } from '../utils/storeSettings'

function RecCircle({ item }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = item.image && !imgFailed

  return (
    <ContentLink to={item.link} className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0">
      <div
        className="w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-[#D52B1E] transition-all duration-200 group-hover:shadow-lg flex items-center justify-center"
        style={{ backgroundColor: item.fallbackBg || '#F3F4F6' }}
      >
        {showImage ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          <span className="text-[28px] font-bold text-gray-500" aria-hidden="true">{item.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-gray-700 group-hover:text-[#D52B1E] transition-colors text-center max-w-[100px] leading-tight">
        {item.name}
      </p>
    </ContentLink>
  )
}

/**
 * "Top recommendations" tiles. Admin-managed in Storefront UI → Homepage Banners
 * (setting `top_recommendations`, matching the client template's Recommendations
 * sheet). Hidden until configured — no placeholder tiles.
 */
export default function TopRecommendations() {
  const { settings, loading } = useSiteSettings()
  const items = Array.isArray(settings?.top_recommendations)
    ? settings.top_recommendations.filter(item => item?.name)
    : []

  if (loading) return <div className="py-8"><SkeletonCircles count={8} /></div>
  if (items.length === 0) return null

  return (
    <section className="bg-white py-8 border-b border-gray-100 soft-in">
      <div className="max-w-[1200px] mx-auto px-4">
        <SectionHeading>{getHeadings(settings).productTypes}</SectionHeading>
        <div className="flex flex-wrap items-start justify-center gap-x-9 gap-y-6">
          {items.map((item, i) => (
            <RecCircle key={`${item.name}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
