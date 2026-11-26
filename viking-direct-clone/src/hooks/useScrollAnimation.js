import { useEffect, useRef, useState } from 'react'

/**
 * Returns [ref, isVisible] — attach ref to DOM element.
 * Once it enters the viewport, isVisible flips to true (stays true).
 */
export default function useScrollAnimation(threshold = 0.12) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, isVisible]
}
