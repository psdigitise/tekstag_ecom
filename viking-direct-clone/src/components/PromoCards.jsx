import { Gift } from 'lucide-react'
import { useSiteSettings } from '../context/SettingsContext'
import ContentLink from './ContentLink'
import { Skeleton } from './Loaders'

/**
 * Promo cards under the category circles. Admin-managed in Storefront UI →
 * Hero & Basics (setting `promo_cards`). The old built-in cards advertised
 * offers that don't exist, so nothing shows until the admin adds real ones.
 */
export default function PromoCards() {
  const { settings, loading } = useSiteSettings()

  const displayCards = Array.isArray(settings?.promo_cards)
    ? settings.promo_cards.filter(card => card?.title)
    : []

  if (loading) return (
    <div role="status" aria-label="Loading" className="max-w-[1200px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[0, 1, 2].map(i => <Skeleton key={i} className="h-[160px] rounded-xl" />)}
    </div>
  )
  if (displayCards.length === 0) return null

  // Dynamic grid adaptation based on card count
  const getGridClass = (len) => {
    if (len === 1) return 'grid-cols-1 max-w-md mx-auto'
    if (len === 2) return 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
    if (len === 4) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
    return 'grid-cols-1 lg:grid-cols-3'
  }

  return (
    <section className="bg-white py-6 soft-in">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className={`grid gap-6 ${getGridClass(displayCards.length)}`}>
          {displayCards.map((card, index) => (
            <ContentLink
              key={index}
              to={card.link}
              // A picked colour wins; older cards keep their saved style.
              style={card.bgColor ? { backgroundColor: card.bgColor } : undefined}
              className={`${card.bgColor ? 'border border-gray-200' : card.bg || 'bg-[#EDEDED]'} rounded-xl overflow-hidden relative flex items-center p-5 min-h-[160px] hover:shadow-lg transition-all group`}
            >
              {/* Top Right Badge (if exists) */}
              {card.badge && (
                <div className="absolute top-4 right-0 bg-[#00857C] text-white text-[12px] font-bold px-3 py-1 rounded-l-md shadow-sm z-20">
                  {card.badge}
                </div>
              )}

              {/* Image Area */}
              <div className="w-[140px] h-[120px] relative flex-shrink-0 flex items-center justify-center ml-2">
                {card.image ? (
                  <img
                    src={card.image}
                    alt=""
                    className="w-full h-full object-contain mix-blend-multiply transform group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
                    <Gift size={32} className={card.textColor || 'text-gray-400'} />
                  </div>
                )}
              </div>

              {/* Text Area */}
              <div className={`ml-4 flex-1 ${card.textColor || 'text-gray-900'}`}>
                <h3 className="text-[18px] font-bold leading-tight mb-2">
                  {card.title}
                </h3>
                <p className={`text-[13px] leading-snug opacity-90`}>
                  {card.subtitle}
                </p>
              </div>
            </ContentLink>
          ))}
        </div>
      </div>
    </section>
  )
}
