import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { uploadImage } from '../../api'

/**
 * Picture field for admin forms: upload a file (or paste a web link) and see a
 * preview. The stored value is always the picture's address.
 */
export default function ImageInput({ value, onChange, onBusyChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [useLink, setUseLink] = useState(false)
  const fileRef = useRef(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setBusy(true)
    onBusyChange?.(true)
    try {
      const { url } = await uploadImage(file)
      // The row may have been moved or removed while uploading.
      if (mounted.current) onChange(url)
    } catch (err) {
      if (mounted.current) setError(err.message || 'Upload failed.')
    } finally {
      onBusyChange?.(false)
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <div data-testid="image-input">
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 border border-gray-200 rounded bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
          {value
            ? <img src={value} alt="Preview" className="max-w-full max-h-full object-contain" />
            : <span className="text-[11px] text-gray-400">No picture</span>}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handleFile} className="hidden" />
          <button type="button" disabled={busy} onClick={() => fileRef.current.click()} className="flex items-center gap-1.5 bg-[#00857C] hover:bg-[#006B63] disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-sm">
            <Upload size={13} /> {busy ? 'Uploading…' : value ? 'Replace picture' : 'Upload picture'}
          </button>
          {value && (
            <button type="button" disabled={busy} onClick={() => onChange('')} className="flex items-center gap-1 text-xs text-red-600 hover:underline">
              <Trash2 size={12} /> Remove
            </button>
          )}
          <button type="button" onClick={() => setUseLink(v => !v)} className="text-xs text-[#0066CC] hover:underline">
            {useLink ? 'Hide web link' : 'Use a web link instead'}
          </button>
        </div>
      </div>
      {useLink && (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://…" aria-label="Picture web link" className="mt-2 w-full border border-gray-300 p-2 text-sm rounded bg-white outline-none focus:border-[#00857C]" />
      )}
      {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
