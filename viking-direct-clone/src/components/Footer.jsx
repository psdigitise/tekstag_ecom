import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Clock, Facebook, Instagram, Linkedin, ArrowRight, ArrowUp } from 'lucide-react'
import { useCategories } from '../context/CategoriesContext'
import { useSiteSettings } from '../context/SettingsContext'
import { getStoreText, TEXT_DEFAULTS } from '../utils/storeSettings'
import ContentLink from './ContentLink'

const ACCOUNT_LINKS = [
  { label: 'My account', to: '/account' },
  { label: 'Orders', to: '/account/orders' },
  { label: 'Invoice portal', to: '/account/invoices' },
  { label: 'Shopping lists', to: '/account/lists' },
  { label: 'Basket', to: '/cart' },
]
const SOCIALS = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
]
// How many product types to list.
const TYPE_LIMIT = 8

/** "A, B and C" */
function listNames(names) {
  if (names.length < 2) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function Column({ title, children }) {
  return (
    <nav aria-label={title}>
      <h4 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white mb-5">
        {title}
        <span className="block w-8 h-[2px] bg-[#D52B1E] mt-2" />
      </h4>
      <ul className="space-y-2.5">{children}</ul>
    </nav>
  )
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="group inline-flex items-center text-[13px] text-gray-400 hover:text-white">
        <span className="transition-transform duration-200 group-hover:translate-x-1">{children}</span>
      </Link>
    </li>
  )
}

/**
 * Site footer. Categories come from the catalog. Company description, contact
 * details and social links come from Admin → Storefront UI → Trust & Footer;
 * the red banner, logo and bottom line come from Admin → Store Settings.
 * Anything left empty is not shown.
 */
export default function Footer() {
  const { categories } = useCategories()
  const { settings } = useSiteSettings()
  const info = settings?.footer || {}
  const text = getStoreText(settings)
  const storeName = text.storeName || TEXT_DEFAULTS.storeName

  const mains = categories.filter(c => c.slug && !c.parent)
  const types = categories.filter(c => c.slug && c.parent)

  const about = info.about?.trim()
    || (mains.length ? `${listNames(mains.map(c => c.name))} from ${storeName.charAt(0).toUpperCase()}${storeName.slice(1)}.` : '')
  const contacts = [
    info.phone && { Icon: Phone, text: info.phone, href: `tel:${info.phone.replace(/[^+\d]/g, '')}` },
    info.email && { Icon: Mail, text: info.email, href: `mailto:${info.email.trim()}` },
    info.address && { Icon: MapPin, text: info.address },
    info.hours && { Icon: Clock, text: info.hours },
  ].filter(Boolean)
  const socials = SOCIALS.filter(s => /^https?:\/\//i.test(info[s.key]?.trim() || ''))

  return (
    <footer className="bg-[#1a1a2e] text-gray-300">
      {/* Call to action */}
      {text.footerHeadline && (
        <div data-testid="footer-banner" className="bg-gradient-to-r from-[#D52B1E] to-[#9f1c12]">
          <div className="max-w-[1200px] mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <p className="text-[22px] font-black text-white leading-tight">{text.footerHeadline}</p>
              {text.footerSubtext && <p className="text-[13px] text-white/80 mt-1">{text.footerSubtext}</p>}
            </div>
            {text.footerButton && (
              <ContentLink to={text.footerButtonLink || '/category'} className="group self-start md:self-auto inline-flex items-center gap-2 bg-white text-[#1a1a2e] hover:bg-gray-100 text-[14px] font-bold px-6 py-3 rounded-sm whitespace-nowrap shadow-lg">
                {text.footerButton}
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              </ContentLink>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-10">
        {/* Brand, description, contact */}
        <div className="sm:col-span-2 lg:col-span-4">
          <Link to="/home" className="inline-block text-white" style={{ fontFamily: '"Arial Black", Arial, sans-serif', fontWeight: 900, fontSize: 32, lineHeight: 1 }}>
            {text.logo
              ? <img src={text.logo} alt={storeName} className="h-12 w-auto max-w-[220px] object-contain bg-white rounded-sm p-1.5" />
              : storeName}
          </Link>
          {about && <p className="text-[13px] leading-relaxed text-gray-400 mt-4 max-w-[340px] whitespace-pre-line">{about}</p>}

          {contacts.length > 0 && (
            <ul className="mt-5 space-y-3">
              {contacts.map(({ Icon, text, href }) => (
                <li key={text} className="flex items-start gap-3 text-[13px]">
                  <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-[#ff6b5e]" />
                  </span>
                  {href
                    ? <a href={href} className="mt-1.5 text-gray-300 hover:text-white break-all">{text}</a>
                    : <span className="mt-1.5 text-gray-300 whitespace-pre-line">{text}</span>}
                </li>
              ))}
            </ul>
          )}

          {socials.length > 0 && (
            <div className="flex gap-2.5 mt-6">
              {socials.map(({ key, label, Icon }) => (
                <a key={key} href={info[key].trim()} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-gray-300 hover:bg-[#D52B1E] hover:border-[#D52B1E] hover:text-white">
                  <Icon size={17} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <Column title="Categories">
            {mains.map(c => <FooterLink key={c.id} to={`/category/${c.slug}`}>{c.name}</FooterLink>)}
            <FooterLink to="/category">All products</FooterLink>
          </Column>
        </div>

        {types.length > 0 && (
          <div className="lg:col-span-3">
            <Column title="Product types">
              {types.slice(0, TYPE_LIMIT).map(c => <FooterLink key={c.id} to={`/category/${c.slug}`}>{c.name}</FooterLink>)}
            </Column>
          </div>
        )}

        <div className="lg:col-span-2">
          <Column title="Your account">
            {ACCOUNT_LINKS.map(link => <FooterLink key={link.to} to={link.to}>{link.label}</FooterLink>)}
          </Column>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-gray-500">{text.copyright && `© ${new Date().getFullYear()} ${text.copyright}`}</p>
          <div className="flex items-center gap-5">
            {text.footerPriceNote && <span className="text-[12px] text-gray-500">{text.footerPriceNote}</span>}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-300 border border-white/15 rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white"
            >
              Back to top <ArrowUp size={13} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
