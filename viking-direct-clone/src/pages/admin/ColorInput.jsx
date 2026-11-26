import { useRef } from 'react'
import { Check, Plus } from 'lucide-react'

// Ready-made colours by purpose: [colour, name]
export const BACKGROUND_COLORS = [
  ['#FFFFFF', 'White'], ['#F3F4F6', 'Light grey'], ['#D6E8F5', 'Light blue'], ['#E0F2F1', 'Mint'],
  ['#E8F5E9', 'Light green'], ['#FDF3D0', 'Cream yellow'], ['#FFE8D6', 'Peach'], ['#FDE2E4', 'Light pink'],
  ['#EDE7F6', 'Lavender'], ['#E8D5AA', 'Sand'], ['#1F2937', 'Charcoal'], ['#D52B1E', 'Red'],
]
export const TEXT_COLORS = [
  ['#111827', 'Black'], ['#FFFFFF', 'White'], ['#0F766E', 'Teal'], ['#0066CC', 'Blue'], ['#D52B1E', 'Red'], ['#7B4FA8', 'Purple'],
]

const SWATCH = 'w-8 h-8 rounded-full border flex items-center justify-center transition-shadow'

/**
 * Pick a colour by clicking it — no colour codes to type. The "+" circle opens
 * the full colour picker for any other shade.
 */
export default function ColorInput({ value, onChange, colors = BACKGROUND_COLORS }) {
  const pickerRef = useRef(null)
  const current = (value || '').toLowerCase()
  const preset = colors.find(([hex]) => hex.toLowerCase() === current)
  const isCustom = !!current && !preset
  const ring = selected => selected ? 'ring-2 ring-offset-2 ring-[#00857C]' : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300'
  // A tick that stays visible on both light and dark colours.
  const tick = <Check size={15} strokeWidth={3} className="text-white mix-blend-difference" />

  return (
    <div data-testid="color-input">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Colour">
        <button type="button" onClick={() => onChange('')} aria-pressed={!current} title="Default colour" className={`h-8 px-3 rounded-full border border-gray-300 bg-white text-[11px] font-semibold text-gray-600 ${ring(!current)}`}>
          Default
        </button>
        {colors.map(([hex, name]) => (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            aria-label={name}
            aria-pressed={preset?.[0] === hex}
            title={name}
            style={{ backgroundColor: hex }}
            className={`${SWATCH} border-gray-300 ${ring(preset?.[0] === hex)}`}
          >
            {preset?.[0] === hex && tick}
          </button>
        ))}
        <button
          type="button"
          onClick={() => pickerRef.current.click()}
          aria-label="Choose another colour"
          aria-pressed={isCustom}
          title="Choose another colour"
          style={isCustom ? { backgroundColor: value } : undefined}
          className={`${SWATCH} border-dashed border-gray-400 text-gray-500 ${ring(isCustom)}`}
        >
          {isCustom ? tick : <Plus size={15} />}
        </button>
        <input
          ref={pickerRef}
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#ffffff'}
          onChange={e => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          className="w-0 h-0 opacity-0 p-0 border-0"
        />
      </div>
      <p className="text-[11px] text-gray-500 mt-1">Selected: {preset ? preset[1] : isCustom ? 'Custom colour' : 'Default'}</p>
    </div>
  )
}
