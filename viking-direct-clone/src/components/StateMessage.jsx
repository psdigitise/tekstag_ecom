import { PackageSearch, AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Empty and error states for storefront pages.
 *
 *   <StateMessage title="No products found" message="Try another search." />
 *   <StateMessage variant="error" title="Couldn't load products" onRetry={load} />
 */
export default function StateMessage({ variant = 'empty', title, message, onRetry, children, className = '' }) {
  const isError = variant === 'error'
  const Icon = isError ? AlertTriangle : PackageSearch

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`py-16 px-4 flex flex-col items-center text-center ${className}`}
    >
      <Icon size={40} strokeWidth={1.5} className={isError ? 'text-[#D52B1E] mb-3' : 'text-gray-300 mb-3'} />
      <p className="text-[16px] font-bold text-gray-800 mb-1">{title}</p>
      {message && <p className="text-[13px] text-gray-500 max-w-md">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 bg-[#0066CC] hover:bg-[#0052A3] text-white text-[13px] font-bold px-4 py-2 rounded-[2px] transition-colors"
        >
          <RefreshCw size={14} /> Try again
        </button>
      )}
      {children}
    </div>
  )
}
