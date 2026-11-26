import { useState, useEffect, useRef } from 'react'
import { ImageOff } from 'lucide-react'

/**
 * Product image with a neutral placeholder.
 *
 * Shows the real image when there is one. When the product has no image, or the
 * image fails to load, it shows a plain "No image" box — never a stock photo.
 */
export default function ProductImage({ src, alt = '', className = '', placeholderClassName = '', iconSize = 28, ...rest }) {
  const [failed, setFailed] = useState(false)

  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef(null)

  // A new src (e.g. navigating to another product) gets a fresh attempt.
  useEffect(() => {
    setFailed(false)
    setLoaded(!!imgRef.current?.complete && imgRef.current.naturalWidth > 0)
  }, [src])

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt ? `No image available for ${alt}` : 'No image available'}
        className={`flex flex-col items-center justify-center gap-1 bg-gray-50 text-gray-300 ${placeholderClassName}`}
      >
        <ImageOff size={iconSize} strokeWidth={1.5} />
        <span className="text-[11px] text-gray-400">No image</span>
      </div>
    )
  }

  // The picture fades in once it has arrived.
  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`${className} ${loaded ? 'soft-in' : 'img-loading'}`}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
