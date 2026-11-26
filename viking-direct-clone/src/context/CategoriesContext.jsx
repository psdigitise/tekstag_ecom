import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { fetchCategories } from '../api'

/**
 * Single source of category data for the whole app (storefront + admin).
 *
 * Categories come only from the API — there is no hardcoded fallback list.
 * The list reloads when the browser tab regains focus (so changes made in
 * another tab show up) and whenever the admin calls `reload()` after a change.
 */
const CategoriesContext = createContext(null)

const FOCUS_RELOAD_MS = 30_000 // don't refetch on focus more than twice a minute

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const lastLoadedAt = useRef(0)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const data = await fetchCategories()
      setCategories(Array.isArray(data) ? data : [])
      lastLoadedAt.current = Date.now()
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastLoadedAt.current > FOCUS_RELOAD_MS) reload()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  const getBySlug = useCallback(
    slug => categories.find(c => c.slug === slug) || null,
    [categories]
  )

  return (
    <CategoriesContext.Provider value={{ categories, loading, error, reload, getBySlug }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories must be used inside <CategoriesProvider>')
  return ctx
}
