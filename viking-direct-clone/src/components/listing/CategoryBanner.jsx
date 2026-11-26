import { Link } from 'react-router-dom'
import ProductImage from '../ProductImage'

/**
 * Header for a listing: title, short summary, picture and shortcuts to the
 * neighbouring categories. Everything is taken from the catalog.
 */
export default function CategoryBanner({ eyebrow, title, summary, image, chips = [] }) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1a1a2e] via-[#26264a] to-[#3a2540] text-white mb-6 soft-in">
      <span className="absolute -right-16 -top-24 w-[320px] h-[320px] rounded-full bg-white/5" aria-hidden="true" />
      <span className="absolute right-[180px] -bottom-28 w-[220px] h-[220px] rounded-full bg-[#D52B1E]/20" aria-hidden="true" />

      <div className="relative flex items-center justify-between gap-6 px-6 md:px-9 py-7">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff8579] mb-2">{eyebrow}</p>}
          <h1 className="text-[28px] md:text-[34px] font-black leading-tight">{title}</h1>
          {summary && <p className="text-[14px] text-white/75 mt-2 max-w-[620px]">{summary}</p>}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {chips.map(chip => (
                <Link
                  key={chip.to}
                  to={chip.to}
                  aria-current={chip.active ? 'page' : undefined}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-semibold border ${
                    chip.active
                      ? 'bg-white text-[#1a1a2e] border-white'
                      : 'border-white/25 text-white/90 hover:bg-white/15'
                  }`}
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {image && (
          <div className="hidden md:flex flex-shrink-0 w-[170px] h-[170px] rounded-full bg-white items-center justify-center p-5 shadow-2xl overflow-hidden">
            <ProductImage key={image} src={image} alt={title} className="max-w-full max-h-full object-contain" placeholderClassName="w-full h-full rounded-full" />
          </div>
        )}
      </div>
    </section>
  )
}
