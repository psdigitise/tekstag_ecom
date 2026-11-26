import { useState, useEffect } from 'react'
import { Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSiteSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/Loaders'

// [key, label, placeholder, input type]
const FIELDS = [
  ['about', 'About the company', 'A short description shown under the logo', 'textarea'],
  ['address', 'Address', 'Company address', 'textarea'],
  ['phone', 'Phone number', 'Customer service number', 'text'],
  ['email', 'Email address', 'Customer service email', 'email'],
  ['hours', 'Opening hours', 'e.g. Monday to Friday', 'text'],
  ['facebook', 'Facebook page', 'https://…', 'url'],
  ['instagram', 'Instagram page', 'https://…', 'url'],
  ['linkedin', 'LinkedIn page', 'https://…', 'url'],
]
const INPUT = 'w-full border border-gray-300 p-2.5 text-sm rounded-sm bg-white outline-none focus:border-[#00857C]'

/** Company details shown in the website footer (setting "footer"). */
export default function FooterEditor() {
  const { settings, saveSetting } = useSiteSettings()
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  const saved = settings?.footer
  useEffect(() => { setValues(saved || {}) }, [saved])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      const trimmed = Object.fromEntries(FIELDS.map(([key]) => [key, (values[key] || '').trim()]))
      await saveSetting('footer', trimmed)
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} data-testid="footer-editor" className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm mb-6">
      <h2 className="text-lg font-bold text-gray-800">Footer details</h2>
      <p className="text-sm text-gray-500 mb-4">Shown at the bottom of every page. Anything left empty is not displayed.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(([key, label, placeholder, type]) => {
          const props = {
            id: `footer-${key}`,
            value: values[key] || '',
            onChange: e => setValues(v => ({ ...v, [key]: e.target.value })),
            placeholder,
            className: INPUT,
          }
          return (
            <div key={key}>
              <label htmlFor={`footer-${key}`} className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
              {type === 'textarea' ? <textarea rows={3} {...props} /> : <input type={type} {...props} />}
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-end gap-4 mt-5">
        {status === 'success' && <span className="text-sm font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={16} /> Saved!</span>}
        {status === 'error' && <span role="alert" className="text-sm font-bold text-red-600 flex items-center gap-1"><AlertCircle size={16} /> Failed to save</span>}
        <button type="submit" disabled={saving} className="bg-[#00857C] hover:bg-[#006B63] disabled:opacity-60 text-white px-6 py-2 rounded-sm font-bold flex items-center gap-2 text-sm">
          {saving ? <Spinner /> : <Save size={16} />} {saving ? 'Saving…' : 'Save Footer'}
        </button>
      </div>
    </form>
  )
}
