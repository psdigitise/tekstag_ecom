import { useState } from 'react'
import { useSiteSettings } from '../context/SettingsContext'

export default function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)
  const { settings } = useSiteSettings()

  // Admin-managed in Storefront UI → Hero & Basics. There is no built-in offer:
  // the old default advertised a voucher code that doesn't exist, so the banner
  // only shows once the admin has entered real text.
  const text = (settings?.welcome_banner?.text || '').trim()
  const code = (settings?.welcome_banner?.code || '').trim()

  if (dismissed || !text) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-[#D52B1E] text-white py-2.5">
      <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-center gap-3 text-[13px]">
        <span>
          {text}
        </span>
        {code && <>
        <span className="text-white/50">|</span>
        <span>Voucher Code</span>
        <button
          onClick={handleCopy}
          title="Click to copy voucher code"
          className="flex items-center gap-1.5 border border-white/50 rounded px-2.5 py-0.5 font-semibold text-[12px] tracking-wide hover:bg-white/10 transition-all cursor-pointer group relative"
        >
          {code}
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-300">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70 group-hover:text-white transition-colors">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {/* Tooltip */}
          <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-[11px] font-medium bg-gray-900 text-white px-2 py-1 rounded whitespace-nowrap transition-opacity ${
            copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {copied ? '✓ Copied!' : 'Click to copy'}
          </span>
        </button>
        </>}
        <button onClick={() => setDismissed(true)} className="hover:opacity-80">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/70">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
