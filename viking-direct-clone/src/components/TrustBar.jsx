import { Truck, Clock, RotateCcw } from 'lucide-react'
import { useSiteSettings } from '../context/SettingsContext'
import ContentLink from './ContentLink'

const ICONS = {
  truck: <Truck size={20} className="text-[#0066CC]" />,
  clock: <Clock size={20} className="text-[#0066CC]" />,
  rotate: <RotateCcw size={20} className="text-[#0066CC]" />,
}

/**
 * Strip of short service points. Admin-managed (setting `trust_bar`); hidden
 * until confirmed points are saved — there are no built-in claims.
 */
export default function TrustBar() {
  const { settings } = useSiteSettings()
  const items = Array.isArray(settings?.trust_bar)
    ? settings.trust_bar.filter(i => i?.main || i?.highlight || i?.suffix)
    : []

  if (items.length === 0) return null

  return (
    <div className="bg-white border-y border-gray-100 py-3">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-center flex-wrap gap-6 md:gap-10">
          {items.map((item, i) => (
            <ContentLink key={i} to={item.url} className="flex items-center gap-2 text-[13px] text-gray-600">
              {ICONS[item.icon] || null}
              <span>
                <span>{item.main}</span>
                {item.highlight && <span className="font-medium text-[#0066CC]">{item.highlight}</span>}
                <span>{item.suffix}</span>
              </span>
            </ContentLink>
          ))}
        </div>
      </div>
    </div>
  )
}
