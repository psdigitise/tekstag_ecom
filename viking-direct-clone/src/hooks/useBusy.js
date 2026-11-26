import { useCallback, useRef, useState } from 'react'

/**
 * Run an async action once at a time: `busy` drives the button spinner. A second
 * call while one is running doesn't start another (no double saves); it gets the
 * same promise, so it sees the same result or error.
 */
export function useBusy() {
  const [busy, setBusy] = useState(false)
  const running = useRef(null)

  const run = useCallback((action) => {
    if (running.current) return running.current
    setBusy(true)
    running.current = Promise.resolve()
      .then(action)
      .finally(() => {
        running.current = null
        setBusy(false)
      })
    return running.current
  }, [])

  return [busy, run]
}
