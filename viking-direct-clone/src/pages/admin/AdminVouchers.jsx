import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { fetchVouchers, saveVoucher, deleteVoucher } from '../../api'
import { useSiteSettings } from '../../context/SettingsContext'
import { Spinner, SkeletonRows } from '../../components/Loaders'

const INPUT = 'w-full border border-gray-300 p-2.5 text-sm rounded-sm bg-white outline-none focus:border-[#00857C]'
const EMPTY = {
  code: '', voucherType: 'percent', value: '', minOrder: '', usageLimit: '', expiryDate: '',
  freeDelivery: false, isActive: true,
}

/** The API's error text, whether it is a sentence or {"field": ["message"]}. */
function readableError(err) {
  try {
    return Object.values(JSON.parse(err.message)).flat().join(' ')
  } catch {
    return err.message || 'Something went wrong.'
  }
}

function today() {
  const now = new Date()
  return new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Why a code won't work at checkout, or "Active". */
function statusOf(v) {
  if (!v.isActive) return 'Switched off'
  if (v.expiryDate && v.expiryDate < today()) return 'Expired'
  if (v.usageLimit !== null && v.timesUsed >= v.usageLimit) return 'Used up'
  return 'Active'
}

const discountText = v => {
  const value = Number(v.value)
  const parts = []
  if (value > 0) parts.push(v.voucherType === 'percent' ? `${value}% off` : `£${value.toFixed(2)} off`)
  if (v.freeDelivery) parts.push('Free delivery')
  return parts.join(' + ')
}

/** Admin → Vouchers: the discount codes customers can type in the basket. */
export default function AdminVouchers() {
  const { settings } = useSiteSettings()
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(null) // null = closed
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      setVouchers(await fetchVouchers())
      setLoadError('')
    } catch (err) {
      setLoadError(readableError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const open = (voucher, preset = {}) => {
    setError('')
    setEditingId(voucher?.id ?? null)
    setForm(voucher ? {
      code: voucher.code,
      voucherType: voucher.voucherType,
      value: String(Number(voucher.value)),
      minOrder: Number(voucher.minOrder) ? String(Number(voucher.minOrder)) : '',
      usageLimit: voucher.usageLimit ?? '',
      expiryDate: voucher.expiryDate || '',
      freeDelivery: voucher.freeDelivery,
      isActive: voucher.isActive,
    } : { ...EMPTY, ...preset })
  }

  const change = key => e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [key]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveVoucher({
        ...form,
        value: form.value === '' ? '0' : form.value,
        minOrder: form.minOrder === '' ? '0' : form.minOrder,
        usageLimit: form.usageLimit === '' ? null : form.usageLimit,
        expiryDate: form.expiryDate || null,
      }, editingId)
      setForm(null)
      await load()
    } catch (err) {
      setError(readableError(err))
    } finally {
      setSaving(false)
    }
  }

  const run = async (id, action) => {
    setBusyId(id)
    try {
      await action()
      await load()
    } catch (err) {
      alert(readableError(err))
    } finally {
      setBusyId(null)
    }
  }

  const remove = v => {
    if (window.confirm(`Delete the code ${v.code}?`)) {
      if (editingId === v.id) setForm(null)
      run(v.id, () => deleteVoucher(v.id))
    }
  }

  // The homepage welcome banner advertises a code; warn if it wouldn't work.
  const bannerCode = (settings?.welcome_banner?.code || '').trim().toUpperCase()
  const bannerVoucher = vouchers.find(v => v.code.toUpperCase() === bannerCode)
  const bannerBroken = bannerCode && !loading && !loadError && (!bannerVoucher || statusOf(bannerVoucher) !== 'Active')

  return (
    <div className="max-w-5xl pb-20">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-800">Vouchers</h1>
        <button type="button" onClick={() => open(null)} className="bg-[#00857C] hover:bg-[#006B63] text-white px-4 py-2 rounded-sm font-bold flex items-center gap-2 text-sm">
          <Plus size={16} /> New voucher
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Codes customers can enter in the basket.</p>
      <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-sm px-4 py-3 mb-4">
        A discount currently changes only the basket total. Saved orders and invoices do not include it yet.
      </p>

      {bannerBroken && (
        <div data-testid="banner-warning" className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-sm px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <AlertCircle size={16} />
          <span>
            Your welcome banner shows the code <b>{bannerCode}</b>, but{' '}
            {bannerVoucher ? `it is ${statusOf(bannerVoucher).toLowerCase()}.` : 'no voucher with that code exists.'}
          </span>
          {!bannerVoucher && (
            <button type="button" onClick={() => open(null, { code: bannerCode })} className="underline font-bold">Create it</button>
          )}
        </div>
      )}

      {form && (
        <form onSubmit={submit} data-testid="voucher-form" className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Edit voucher' : 'New voucher'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-xs font-bold text-gray-700">Code *
              <input required maxLength={50} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. WELCOME10" className={`${INPUT} mt-1 font-normal`} />
            </label>
            <label className="text-xs font-bold text-gray-700">Discount type
              <select value={form.voucherType} onChange={change('voucherType')} className={`${INPUT} mt-1 font-normal`}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed amount (£)</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-700">{form.voucherType === 'percent' ? 'Percentage off' : 'Amount off (£)'}
              <input type="number" min="0" max={form.voucherType === 'percent' ? 100 : undefined} step="0.01" value={form.value} onChange={change('value')} className={`${INPUT} mt-1 font-normal`} />
            </label>
            <label className="text-xs font-bold text-gray-700">Minimum order (£, excl. VAT)
              <input type="number" min="0" step="0.01" value={form.minOrder} onChange={change('minOrder')} placeholder="No minimum" className={`${INPUT} mt-1 font-normal`} />
            </label>
            <label className="text-xs font-bold text-gray-700">Total number of uses
              <input type="number" min="1" step="1" value={form.usageLimit} onChange={change('usageLimit')} placeholder="Unlimited" className={`${INPUT} mt-1 font-normal`} />
            </label>
            <label className="text-xs font-bold text-gray-700">Last day it works
              <input type="date" value={form.expiryDate} onChange={change('expiryDate')} className={`${INPUT} mt-1 font-normal`} />
            </label>
          </div>
          <div className="flex gap-6 mt-4 text-sm font-bold text-gray-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.freeDelivery} onChange={change('freeDelivery')} /> Free delivery</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={change('isActive')} /> Active</label>
          </div>
          <div className="flex items-center justify-end gap-4 mt-5">
            {error && <span role="alert" className="text-sm font-bold text-red-600 mr-auto">{error}</span>}
            <button type="button" onClick={() => setForm(null)} className="text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="bg-[#00857C] hover:bg-[#006B63] disabled:opacity-60 text-white px-6 py-2 rounded-sm font-bold flex items-center gap-2 text-sm">
              {saving && <Spinner />} {saving ? 'Saving…' : 'Save voucher'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-x-auto">
        {loading ? <div className="p-4"><SkeletonRows /></div> : loadError ? (
          <p role="alert" className="p-6 text-sm text-red-600">
            {loadError} <button type="button" onClick={load} className="underline font-bold">Try again</button>
          </p>
        ) : vouchers.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No vouchers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                {['Code', 'Discount', 'Minimum order', 'Used', 'Last day', 'Status', ''].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {vouchers.map(v => (
                <tr key={v.id} data-testid="voucher-row" className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-bold text-gray-900">{v.code}</td>
                  <td className="px-4 py-3">{discountText(v)}</td>
                  <td className="px-4 py-3">{Number(v.minOrder) ? `£${Number(v.minOrder).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3">{v.timesUsed}{v.usageLimit !== null ? ` of ${v.usageLimit}` : ''}</td>
                  <td className="px-4 py-3">{v.expiryDate || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === v.id}
                      onClick={() => run(v.id, () => saveVoucher({ isActive: !v.isActive }, v.id))}
                      title={v.isActive ? 'Click to switch off' : 'Click to switch on'}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusOf(v) === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {statusOf(v)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" onClick={() => open(v)} aria-label={`Edit ${v.code}`} className="p-1.5 text-gray-500 hover:text-[#00857C]"><Edit2 size={16} /></button>
                    <button type="button" disabled={busyId === v.id} onClick={() => remove(v)} aria-label={`Delete ${v.code}`} className="p-1.5 text-gray-500 hover:text-red-600">
                      {busyId === v.id ? <Spinner /> : <Trash2 size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
