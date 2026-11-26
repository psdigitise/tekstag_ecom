import { useSiteSettings } from '../context/SettingsContext'
import ContentLink from './ContentLink'

/**
 * Row of information banners. Admin-managed (settings `trust_banners_delivery`
 * and `trust_banners_service`); hidden until content is saved.
 */
export default function TrustBanners({ variant = 'delivery' }) {
  const { settings } = useSiteSettings()
  const saved = settings?.[`trust_banners_${variant}`]
  const banners = Array.isArray(saved) ? saved.filter(b => b?.title) : []

  if (banners.length === 0) return null

  return (
    <section className="bg-white py-10 border-t border-gray-100">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {banners.map((banner, i) => (
            <ContentLink key={`${banner.title}-${i}`} to={banner.url} className="group">
              {banner.image && (
                <div className="relative overflow-hidden rounded-sm h-[200px]">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
              <div className="mt-3 text-center">
                <p className="font-bold text-[15px] text-gray-800">{banner.title}</p>
                {banner.subtitle && <p className="text-[13px] text-gray-500 mt-0.5">{banner.subtitle}</p>}
              </div>
            </ContentLink>
          ))}
        </div>
      </div>
    </section>
  )
}
