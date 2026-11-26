import SectionHeading from './SectionHeading'
import ContentLink from './ContentLink'
import { useSiteSettings } from '../context/SettingsContext'
import { getHeadings } from '../utils/storeSettings'

// Text colour choices offered in the admin (classes must exist in source for Tailwind).
const TEXT_STYLES = {
  dark: { title: 'text-gray-900', subtitle: 'text-gray-600' },
  light: { title: 'text-white', subtitle: 'text-white/80' },
}

/**
 * "Deals, offers & trending" tiles.
 *
 * Admin-managed in Storefront UI → Homepage Banners (setting `deals_section`).
 * The previous hardcoded tiles advertised offers and prices that don't exist
 * ("From only £3.47", "Up to £100 off"), so the section stays hidden until the
 * admin adds real deals.
 */
export default function DealsSection() {
  const { settings } = useSiteSettings()
  const dealItems = Array.isArray(settings?.deals_section)
    ? settings.deals_section.filter(item => item?.title)
    : []

  if (dealItems.length === 0) return null

  return (
    <section className="bg-white py-10">
      <div className="max-w-[1200px] mx-auto px-4">
        <SectionHeading>{getHeadings(settings).range}</SectionHeading>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {dealItems.map((item, i) => {
            const text = TEXT_STYLES[item.textStyle] || TEXT_STYLES.dark
            return (
              <ContentLink
                key={`${item.title}-${i}`}
                to={item.link}
                className="rounded-xl overflow-hidden flex flex-col cursor-pointer hover:shadow-xl transition-all duration-300 group"
                style={{ backgroundColor: item.bgColor || '#EDEDED' }}
              >
                {/* Image Area */}
                <div className="aspect-[4/5] relative overflow-hidden p-4 flex items-center justify-center">
                  {/* Red Discount Badge */}
                  {item.badge && (
                    <div className="absolute top-0 left-0 bg-[#D52B1E] text-white text-[11px] font-bold px-3 py-1.5 rounded-br-xl z-20 shadow-md">
                      <span className="leading-tight block text-center">
                        {item.badge.split(' ').map((word, w) => (
                          <span key={w} className="block">{word}</span>
                        ))}
                      </span>
                    </div>
                  )}

                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500 drop-shadow-sm"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                </div>

                {/* Text Area */}
                <div className="p-4 pt-0 mt-auto min-h-[90px]">
                  <h3 className={`text-[15px] font-bold leading-tight mb-1 ${text.title}`}>
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className={`text-[12px] leading-snug ${text.subtitle}`}>
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </ContentLink>
            )
          })}
        </div>
      </div>
    </section>
  )
}
