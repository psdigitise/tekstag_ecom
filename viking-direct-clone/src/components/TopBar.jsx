import { useSiteSettings } from '../context/SettingsContext'
import { getStoreText } from '../utils/storeSettings'

/** Thin notice strip above the header. Text and visibility: Admin → Store Settings. */
export default function TopBar() {
  const { settings, loading } = useSiteSettings()
  const { showTopBar, topBarText } = getStoreText(settings)

  if (!loading && (!showTopBar || !topBarText)) return null

  return (
    <div data-testid="top-bar" className="bg-[#1a1a2e] text-white text-[11px] py-2 border-b border-[#2a2a4a]">
      <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-end min-h-[17px]">
        <span className="font-normal">{loading ? '' : topBarText}</span>
      </div>
    </div>
  )
}
