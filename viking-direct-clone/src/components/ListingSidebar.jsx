import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Check } from 'lucide-react'

// `key` is the value the API's `price` filter expects ("low-high", ex VAT).
export const PRICE_BRACKETS = [
  { label: 'Under £5',    key: '0-5' },
  { label: '£5 - £15',    key: '5-15' },
  { label: '£15 - £30',   key: '15-30' },
  { label: '£30 - £50',   key: '30-50' },
  { label: '£50 - £100',  key: '50-100' },
  { label: '£100 - £200', key: '100-200' },
  { label: 'Over £200',   key: '200-' },
]

// Counts come from GET /api/products/facets/, so they cover the whole listing,
// not just the page being shown.
function buildSections(facets) {
  if (!facets) return []

  const categoryOptions = facets.categories.map(c => ({ label: c.name, key: String(c.id), count: c.count }))
  const brands = facets.brands.map(b => ({ label: b.name, key: b.name, count: b.count }))

  // Tekstag's Selection
  const vikingSelection = []
  if (facets.eco > 0) vikingSelection.push({ label: 'Eco products', key: 'eco', count: facets.eco })
  if (facets.bestPrice > 0) vikingSelection.push({ label: 'Buy More, Save More', key: 'bestPrice', count: facets.bestPrice })

  const priceOptions = PRICE_BRACKETS
    .map(b => ({ ...b, count: facets.price.find(p => p.key === b.key)?.count || 0 }))
    .filter(b => b.count > 0)

  return [
    ...(categoryOptions.length > 0 ? [{
      key: 'category',
      title: 'Category',
      defaultOpen: true,
      options: categoryOptions,
    }] : []),
    ...(vikingSelection.length > 0 ? [{
      key: 'vikingSelection',
      title: "Tekstag's Selection",
      defaultOpen: true,
      options: vikingSelection,
    }] : []),
    ...(brands.length > 0 ? [{
      key: 'brand',
      title: 'Brand',
      defaultOpen: brands.length <= 4,
      options: brands,
    }] : []),
    ...(priceOptions.length > 0 ? [{
      key: 'price',
      title: 'Price',
      defaultOpen: true,
      options: priceOptions,
    }] : []),
    ...(facets.available > 0 ? [{
      key: 'availability',
      title: 'Availability',
      defaultOpen: true,
      options: [{ label: 'Available', key: 'available', count: facets.available }],
    }] : []),
  ]
}

function FilterSection({ section, activeFilters, onFilterChange, isOpen, onToggle }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? section.options : section.options.slice(0, 5)

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-gray-50 transition-colors bg-[#F9F9F9]"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-gray-800 tracking-tight">
            {section.title}
          </span>
          <span className="text-[13px] text-gray-500 font-normal">
            ({section.options.length})
          </span>
        </div>
        <div className="text-[#0066CC]">
          {isOpen ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
        </div>
      </button>

      {isOpen && (
        <div className="py-2.5 px-4 bg-white">
          <div className="flex flex-col gap-2.5">
            {visible.map((opt, i) => {
              const checked = activeFilters[section.key]?.includes(opt.key) || false
              return (
                <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onFilterChange(section.key, opt.key)}
                      className="peer appearance-none w-4 h-4 border border-gray-300 rounded-[2px] checked:bg-[#0066CC] checked:border-[#0066CC] transition-colors cursor-pointer"
                    />
                    <Check size={12} strokeWidth={4} className="text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100" />
                  </div>
                  <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">
                    {opt.label} ({opt.count})
                  </span>
                </label>
              )
            })}
          </div>
          {section.options.length > 5 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="text-[13px] text-[#0066CC] hover:underline mt-3"
            >
              {showAll ? 'Show less' : 'Show all'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ListingSidebar({ facets, activeFilters, onFilterChange }) {
  const sections = useMemo(() => buildSections(facets), [facets])

  const [openMap, setOpenMap] = useState({})

  const isOpen = (section) => openMap[section.key] ?? section.defaultOpen

  const toggleSection = (key) =>
    setOpenMap(prev => ({ ...prev, [key]: !isOpen(sections.find(s => s.key === key)) }))

  const hasActiveFilters = Object.values(activeFilters).some(v => v.length > 0)

  return (
    <aside className="w-[240px] flex-shrink-0 hidden md:block sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="bg-white">
        {hasActiveFilters && (
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-700">Active filters</span>
            <button
              onClick={() => onFilterChange('__clear__', null)}
              className="text-[12px] text-[#D52B1E] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {sections.map(section => (
          <FilterSection
            key={section.key}
            section={section}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
            isOpen={isOpen(section)}
            onToggle={() => toggleSection(section.key)}
          />
        ))}

      </div>
    </aside>
  )
}
