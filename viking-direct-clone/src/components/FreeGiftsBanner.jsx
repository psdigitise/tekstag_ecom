import { useSiteSettings } from '../context/SettingsContext'
import ContentLink from './ContentLink'

/**
 * "FREE gifts for you" strip. Admin-managed in Storefront UI → Homepage Banners
 * (setting `free_gifts_banner`). The old stock-photo defaults implied a gift
 * offer that doesn't exist, so the strip is hidden until the admin adds gifts.
 */
export default function FreeGiftsBanner() {
  const { settings } = useSiteSettings()

  const activeImages = Array.isArray(settings?.free_gifts_banner)
    ? settings.free_gifts_banner.filter(img => img?.src)
    : []

  if (activeImages.length === 0) return null

  return (
    <section className="bg-[#EDE7F6] py-8">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center gap-8 overflow-x-auto">
          <div className="flex-shrink-0">
            <h2 className="text-[28px] font-black text-gray-900 leading-tight">
              FREE gifts<br />for you
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-center flex-wrap">
            {activeImages.map((img, i) => (
              <ContentLink key={i} to={img.link} className="flex-shrink-0 group">
                <img
                  src={img.src}
                  alt={img.alt || 'Gift'}
                  className="h-[100px] w-auto object-contain group-hover:scale-110 transition-transform duration-200 drop-shadow-sm"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </ContentLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
