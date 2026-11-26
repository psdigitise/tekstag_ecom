import { useSiteSettings } from '../context/SettingsContext'
import ContentLink from './ContentLink'

/**
 * Large feature banners. Admin-managed (setting `viking_one_section`); hidden
 * until content is saved.
 */
export default function VikingOneSection() {
  const { settings } = useSiteSettings()
  const cards = Array.isArray(settings?.viking_one_section)
    ? settings.viking_one_section.filter(c => c?.title)
    : []

  if (cards.length === 0) return null

  return (
    <section className="bg-white py-10 border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card, i) => (
            <ContentLink key={`${card.title}-${i}`} to={card.url} className="group border border-gray-100 rounded-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-[200px] overflow-hidden flex">
                <div className="w-2/3 relative">
                  {card.image && (
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                </div>
                <div className={`w-1/3 ${card.accentColor ? '' : card.accentBg || 'bg-gray-100'} flex items-center justify-center`} style={card.accentColor ? { backgroundColor: card.accentColor } : undefined}>
                  {card.badge && (
                    <span className={`text-[28px] font-black ${card.badgeTextColor ? '' : card.badgeColor || 'text-gray-700'} font-mono`} style={card.badgeTextColor ? { color: card.badgeTextColor } : undefined}>
                      {card.badge}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <p className="font-bold text-[15px] text-gray-800">{card.title}</p>
                {card.subtitle && <p className="text-[13px] text-gray-500 mt-0.5 mb-2">{card.subtitle}</p>}
                {card.url && card.link && <p className="text-[13px] text-[#0066CC] hover:underline">{card.link}</p>}
              </div>
            </ContentLink>
          ))}
        </div>
      </div>
    </section>
  )
}
