import { useEffect } from 'react'
import { useSiteSettings } from '../context/SettingsContext'
import { getStoreText } from '../utils/storeSettings'

/** Browser tab title, set in Admin → Store Settings. */
export default function DocumentTitle() {
  const { settings, loading } = useSiteSettings()
  const title = getStoreText(settings).browserTitle

  useEffect(() => {
    if (!loading && title) document.title = title
  }, [loading, title])

  return null
}
