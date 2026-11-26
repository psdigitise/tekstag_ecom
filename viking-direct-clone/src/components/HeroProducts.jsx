import { Clock } from 'lucide-react'
import ContentLink from './ContentLink'
import { Skeleton } from './Loaders'
import { useSiteSettings } from '../context/SettingsContext'

/**
 * Two large promotional banners under the category circles.
 *
 * Admin-managed in Storefront UI → Homepage Banners (setting `hero_banners`).
 * These used to be hardcoded offers with made-up prices ("from £2.29"), so they
 * are now hidden until the admin enters real promotions.
 */
export default function HeroProducts() {
  const { settings, loading } = useSiteSettings()
  const banners = Array.isArray(settings?.hero_banners)
    ? settings.hero_banners.filter(b => b?.title)
    : []

  if (loading) return (
    <div role="status" aria-label="Loading" className="max-w-[1200px] mx-auto px-4 pt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
      <Skeleton className="h-[260px]" /><Skeleton className="h-[260px]" />
    </div>
  )
  if (banners.length === 0) return null

  return (
    <section className="bg-white pt-5 soft-in">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className={`grid grid-cols-1 gap-3 ${banners.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {banners.map((banner, i) => (
            <ContentLink
              key={`${banner.title}-${i}`}
              to={banner.link}
              className="group rounded-lg overflow-hidden flex flex-col relative min-h-[260px] hover:shadow-lg transition-shadow"
              style={{ backgroundColor: banner.bgColor || '#D6E8F5' }}
            >
              {/* Discount badge */}
              {banner.badgeText && (
                <div className="absolute top-4 right-4 bg-[#D52B1E] text-white text-[11px] font-bold px-3 py-2 rounded-full text-center leading-tight whitespace-pre-line z-10">
                  {banner.badgeText}
                </div>
              )}

              <div className="flex flex-1">
                {/* Left: text content */}
                <div className="flex flex-col justify-between p-5 flex-1">
                  <div>
                    <h3 className="text-[26px] font-black text-gray-900 leading-tight max-w-[260px]">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p className="text-sm text-gray-700 mt-2 max-w-[240px] leading-relaxed">{banner.subtitle}</p>
                    )}
                    {banner.delivery && (
                      <div className="flex items-center gap-1.5 mt-3 text-[12px] text-gray-600">
                        <Clock size={13} />
                        {banner.delivery}
                      </div>
                    )}
                  </div>

                  {banner.link && !banner.price && (
                    <span className="mt-4 self-start bg-gray-900 group-hover:bg-[#D52B1E] transition-colors text-white text-[13px] font-bold px-4 py-2 rounded-sm">
                      View products ›
                    </span>
                  )}

                  {/* Price (only when the admin entered one) */}
                  {banner.price && (
                    <div className="mt-4">
                      {banner.priceLabel && (
                        <div className="inline-flex items-center gap-1 bg-[#D52B1E] text-white text-[11px] font-bold px-2.5 py-1 rounded-sm mb-1">
                          {banner.priceLabel}
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-[32px] font-black text-gray-900 leading-none">
                          {banner.price}
                        </span>
                        {banner.unit && <span className="text-[13px] text-gray-500">{banner.unit}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: image */}
                {banner.image && (
                  <div className="flex items-center justify-center p-3 flex-shrink-0 w-[45%] max-w-[270px]">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      // Multiply blends a white photo background into the banner colour.
                      className="max-h-[240px] w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}
              </div>
            </ContentLink>
          ))}
        </div>
      </div>
    </section>
  )
}
