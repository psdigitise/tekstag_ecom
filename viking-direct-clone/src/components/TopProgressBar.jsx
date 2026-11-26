import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { onNetworkChange } from '../api'

/**
 * Thin bar at the top of the window. It starts on every navigation and while any
 * request is running, then completes and fades out.
 */
export default function TopProgressBar() {
  const { pathname, search } = useLocation()
  const [pending, setPending] = useState(0)
  const [navigating, setNavigating] = useState(false)
  const [state, setState] = useState('idle') // idle | loading | done

  useEffect(() => onNetworkChange(setPending), [])

  useEffect(() => {
    setNavigating(true)
    const timer = setTimeout(() => setNavigating(false), 250)
    return () => clearTimeout(timer)
  }, [pathname, search])

  const busy = pending > 0 || navigating

  useEffect(() => {
    if (busy) { setState('loading'); return }
    setState(s => (s === 'loading' ? 'done' : s))
    const timer = setTimeout(() => setState('idle'), 450)
    return () => clearTimeout(timer)
  }, [busy])

  if (state === 'idle') return null
  return <div data-testid="progress-bar" aria-hidden="true" className={`progress-bar progress-bar--${state}`} />
}
