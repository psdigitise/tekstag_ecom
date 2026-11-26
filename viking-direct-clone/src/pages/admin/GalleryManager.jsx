import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { fetchProductImages, uploadProductImages, deleteProductImage, makeMainImage } from '../../api'

/**
 * Photo gallery inside the product editor. Changes save immediately and apply
 * to every size that shares the product's group code.
 */
export default function GalleryManager({ productId, shared, onMainChanged }) {
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProductImages(productId).then(setPhotos).catch(err => setError(err.message))
  }, [productId])

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      await action()
      setPhotos(await fetchProductImages(productId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const upload = (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (files.length) run(() => uploadProductImages(productId, files))
  }

  return (
    <div data-testid="gallery-manager">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 border-b pb-1">Photo Gallery ({photos.length})</p>
      <p className="text-xs text-gray-500 mb-3">
        {shared ? 'Shared by all sizes of this product. ' : ''}Changes here save immediately.
      </p>
      {error && <p role="alert" className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="grid grid-cols-4 gap-3 mb-3">
        {photos.map(photo => (
          <div key={photo.id} className="border border-gray-200 rounded-sm p-1.5 flex flex-col items-center gap-1">
            <div className="relative w-full">
              <img src={photo.url} alt="" className="w-full h-24 object-contain" />
              <button
                type="button"
                disabled={busy}
                aria-label="Delete photo"
                onClick={() => window.confirm('Remove this photo from the gallery?') && run(() => deleteProductImage(photo.id))}
                className="absolute top-0 right-0 bg-white border border-gray-200 rounded-full p-0.5 text-red-600 hover:bg-red-50"
              >
                <X size={14} />
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(async () => { await makeMainImage(photo.id); onMainChanged() })}
              className="text-xs font-semibold text-[#0066CC] hover:underline disabled:opacity-50"
            >
              Set as main{shared ? ' (all sizes)' : ''}
            </button>
          </div>
        ))}
      </div>
      <label className="block text-sm font-bold text-gray-700 mb-1">Add photos</label>
      <input type="file" accept="image/*" multiple disabled={busy} onChange={upload} className="w-full border border-gray-300 p-[9px] rounded-sm bg-white cursor-pointer" />
      {busy && <p className="text-xs text-gray-500 mt-1">Saving…</p>}
    </div>
  )
}
