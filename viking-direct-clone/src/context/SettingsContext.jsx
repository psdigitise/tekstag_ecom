import { createContext, useContext, useState, useEffect } from 'react'
import { fetchSettings, updateSetting } from '../api'

const SettingsContext = createContext()

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  // True when settings couldn't be read, so charges must not be guessed.
  const [loadError, setLoadError] = useState(false)

  const loadSettings = async () => {
    try {
      const data = await fetchSettings()
      // Map [{key: 'welcome_banner', value: ...}] to { welcome_banner: ... }
      const mapped = {}
      data.forEach(item => {
        mapped[item.key] = item.value
      })
      setSettings(mapped)
      setLoadError(false)
    } catch (err) {
      console.error("Failed to load settings", err)
      // Keep what was already loaded; otherwise use an empty object.
      setSettings(prev => prev || {})
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const saveSetting = async (key, value) => {
    const updated = await updateSetting(key, value)
    setSettings(prev => ({ ...prev, [key]: updated.value }))
    return updated
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, loadError, saveSetting, refreshSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SettingsContext)
}
