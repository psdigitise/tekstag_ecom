import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSiteSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/Loaders'
import ImageInput from './ImageInput'
import LinkInput from './LinkInput'
import {
  PRICING_DEFAULTS, TEXT_DEFAULTS, HEADING_DEFAULTS, INVOICE_DEFAULTS, getPricing, basketTotals,
} from '../../utils/storeSettings'

const INPUT = 'w-full border border-gray-300 p-2.5 text-sm rounded-sm bg-white outline-none focus:border-[#00857C]'

// Each form saves one site setting.
const FORMS = {
  prices: [{
    settingKey: 'pricing',
    title: 'VAT and delivery',
    description: 'Used to calculate the basket total. Confirm these figures with the business before going live.',
    defaults: PRICING_DEFAULTS,
    fields: [
      { key: 'vatRate', label: 'VAT rate (%)', type: 'number', max: 100, required: true,
        help: 'Added in the basket and on invoices (older invoices too). Product "incl. VAT" prices are not changed; edit those in Catalog.' },
      { key: 'deliveryCharge', label: 'Delivery charge (£)', type: 'number', required: true, help: 'Enter 0 for free delivery on every order.' },
      { key: 'freeDeliveryOver', label: 'Free delivery from (£, excl. VAT)', type: 'number', help: 'Leave empty to always charge delivery.' },
    ],
  }],
  header: [{
    settingKey: 'store_text',
    title: 'Header and footer',
    description: 'Clear a box to hide that text on the website.',
    defaults: TEXT_DEFAULTS,
    fields: [
      { key: 'storeName', label: 'Store name (shown as the logo)' },
      { key: 'logo', label: 'Logo picture (replaces the store name)', type: 'image' },
      { key: 'browserTitle', label: 'Browser tab title' },
      { key: 'showTopBar', label: 'Show the top notice bar', type: 'checkbox' },
      { key: 'topBarText', label: 'Top notice text' },
      { key: 'footerPriceNote', label: 'Footer price note' },
      { key: 'footerHeadline', label: 'Red footer banner: headline', help: 'Empty headline hides the whole banner.' },
      { key: 'footerSubtext', label: 'Red footer banner: small text' },
      { key: 'footerButton', label: 'Red footer banner: button text' },
      { key: 'footerButtonLink', label: 'Red footer banner: button opens', type: 'link' },
      { key: 'copyright', label: 'Copyright line (the year is added for you)' },
    ],
  }],
  headings: [{
    settingKey: 'headings',
    title: 'Homepage headings',
    description: 'Clear a box to hide that heading. A section only appears when it has content.',
    defaults: HEADING_DEFAULTS,
    fields: [
      { key: 'categories', label: 'Category circles' },
      { key: 'range', label: 'Range tiles' },
      { key: 'productTypes', label: 'Product type circles' },
      { key: 'brands', label: 'Brand strip (needs two or more brands)' },
      { key: 'viewed', label: 'Product row: section "viewed"' },
      { key: 'bought', label: 'Product row: section "bought"' },
      { key: 'recommendation', label: 'Product row: section "recommendation"' },
      { key: 'newest', label: 'Product row: newest products' },
    ],
  }],
  invoice: [{
    settingKey: 'invoice',
    title: 'Invoice details',
    description: 'Printed on the PDF invoice. Empty boxes are left off.',
    defaults: INVOICE_DEFAULTS,
    fields: [
      { key: 'title', label: 'Invoice heading' },
      { key: 'businessName', label: 'Business name' },
      { key: 'tagline', label: 'Line under the name' },
      { key: 'vatNumber', label: 'VAT registration number' },
      { key: 'phone', label: 'Support phone number' },
      { key: 'email', label: 'Support email' },
      { key: 'address', label: 'Business address', type: 'textarea' },
      { key: 'footer', label: 'Message at the bottom', type: 'textarea' },
    ],
  }],
}

const TABS = [
  { id: 'prices', label: 'Prices & Delivery' },
  { id: 'header', label: 'Header & Footer' },
  { id: 'headings', label: 'Homepage Headings' },
  { id: 'invoice', label: 'Invoice' },
]

/** What a customer would pay with the figures currently typed in. */
function PricingPreview({ values }) {
  const pricing = getPricing({ pricing: values })
  return (
    <div data-testid="pricing-preview" className="mt-5 border border-gray-200 rounded-sm overflow-hidden">
      <p className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider">Preview</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Goods (excl. VAT)</th>
            <th className="px-4 py-2 font-medium">VAT</th>
            <th className="px-4 py-2 font-medium">Delivery</th>
            <th className="px-4 py-2 font-medium">Customer pays</th>
          </tr>
        </thead>
        <tbody>
          {[10, 100].map(goods => {
            const { vat, delivery, total } = basketTotals(goods, pricing)
            return (
              <tr key={goods} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2">£{goods.toFixed(2)}</td>
                <td className="px-4 py-2">£{vat.toFixed(2)}</td>
                <td className="px-4 py-2">{delivery === 0 ? 'FREE' : `£${delivery.toFixed(2)}`}</td>
                <td className="px-4 py-2 font-bold">£{total.toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SettingForm({ settingKey, title, description, defaults, fields }) {
  const { settings, saveSetting } = useSiteSettings()
  const [values, setValues] = useState(defaults)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null) // null | 'saved' | error message

  const saved = settings?.[settingKey]
  useEffect(() => { setValues({ ...defaults, ...(saved || {}) }) }, [saved, defaults])

  const change = (key, value) => {
    setStatus(null)
    setValues(v => ({ ...v, [key]: value }))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      const cleaned = Object.fromEntries(fields.map(({ key }) => {
        const value = values[key]
        return [key, typeof value === 'string' ? value.trim() : value]
      }))
      await saveSetting(settingKey, cleaned)
      setStatus('saved')
    } catch (err) {
      setStatus(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} data-testid={`setting-${settingKey}`} className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      <p className="text-sm text-gray-500 mb-5">{description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {fields.map(field => {
          const id = `${settingKey}-${field.key}`
          const value = values[field.key] ?? ''

          if (field.type === 'checkbox') {
            return (
              <label key={field.key} htmlFor={id} className="flex items-center gap-2 text-sm font-bold text-gray-700 md:col-span-2">
                <input id={id} type="checkbox" checked={!!values[field.key]} onChange={e => change(field.key, e.target.checked)} className="w-4 h-4" />
                {field.label}
              </label>
            )
          }

          return (
            <div key={field.key}>
              <label htmlFor={id} className="block text-xs font-bold text-gray-700 mb-1">{field.label}</label>
              {field.type === 'image' && (
                <ImageInput value={value} onChange={v => change(field.key, v)} onBusyChange={setUploading} />
              )}
              {field.type === 'link' && <LinkInput value={value} onChange={v => change(field.key, v)} />}
              {field.type === 'textarea' && (
                <textarea id={id} rows={3} value={value} onChange={e => change(field.key, e.target.value)} className={INPUT} />
              )}
              {field.type === 'number' && (
                <input id={id} type="number" min="0" max={field.max} step="0.01" required={field.required} value={value} onChange={e => change(field.key, e.target.value)} className={INPUT} />
              )}
              {!field.type && (
                <input id={id} type="text" value={value} onChange={e => change(field.key, e.target.value)} className={INPUT} />
              )}
              {field.help && <p className="text-[11px] text-gray-500 mt-1">{field.help}</p>}
            </div>
          )
        })}
      </div>

      {settingKey === 'pricing' && <PricingPreview values={values} />}

      <div className="flex items-center justify-end gap-4 mt-6">
        {status === 'saved' && <span className="text-sm font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={16} /> Saved!</span>}
        {status && status !== 'saved' && <span role="alert" className="text-sm font-bold text-red-600 flex items-center gap-1"><AlertCircle size={16} /> {status}</span>}
        <button type="submit" disabled={saving || uploading} className="bg-[#00857C] hover:bg-[#006B63] disabled:opacity-60 text-white px-6 py-2 rounded-sm font-bold flex items-center gap-2 text-sm">
          {saving ? <Spinner /> : <Save size={16} />} {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

/** Admin → Store Settings: prices, header and footer text, headings and invoice. */
export default function AdminSettings() {
  const { loading, loadError, refreshSettings } = useSiteSettings()
  const [tab, setTab] = useState('prices')

  if (loading) return <p className="p-8 text-gray-500 font-medium flex items-center gap-2"><Spinner /> Loading settings…</p>

  // Editing on top of defaults would overwrite what is really saved.
  if (loadError) {
    return (
      <div role="alert" className="p-8 text-gray-700">
        <p className="font-bold">We couldn't load the saved settings.</p>
        <button type="button" onClick={refreshSettings} className="mt-3 underline font-bold text-[#00857C]">Try again</button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Store Settings</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Pictures and banners are in <Link to="/admin/storefront" className="text-[#0066CC] hover:underline">Storefront UI</Link>,
        as are the company phone, address and social links shown in the footer (Trust &amp; Footer tab).
      </p>

      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-6 py-3 font-bold text-sm border-b-2 whitespace-nowrap ${
              tab === id ? 'border-[#00857C] text-[#00857C]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {FORMS[tab].map(form => <SettingForm key={form.settingKey} {...form} />)}
    </div>
  )
}
