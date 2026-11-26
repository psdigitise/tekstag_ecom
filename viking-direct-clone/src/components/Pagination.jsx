import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Page numbers to show: first, last, and the neighbours of the current page. */
function pageList(page, totalPages) {
  const wanted = [1, page - 1, page, page + 1, totalPages]
  const pages = [...new Set(wanted.filter(p => p >= 1 && p <= totalPages))].sort((a, b) => a - b)
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? [`gap-${p}`, p] : [p]))
}

const BUTTON = 'min-w-[34px] h-[34px] px-2 flex items-center justify-center rounded-[2px] border text-[13px] font-semibold transition-colors'

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const idle = 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-6">
      <button type="button" className={`${BUTTON} ${idle}`} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft size={16} />
      </button>
      {pageList(page, totalPages).map(p => typeof p === 'string' ? (
        <span key={p} className="px-1 text-gray-400">…</span>
      ) : (
        <button
          type="button"
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`${BUTTON} ${p === page ? 'border-[#0066CC] bg-[#0066CC] text-white' : idle}`}
        >
          {p}
        </button>
      ))}
      <button type="button" className={`${BUTTON} ${idle}`} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
