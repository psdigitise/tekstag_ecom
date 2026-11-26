import { useState, useEffect, useCallback } from 'react'
import { Search, X, ChevronRight, Package, Truck, Check, CheckCircle, Clock, XCircle, RefreshCw, RotateCcw, MapPin, User, StickyNote, CalendarDays } from 'lucide-react'
import { fetchAllOrders, updateOrder } from '../../api'
import { formatPrice } from '../../utils/product'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  { key: '',                label: 'All Orders' },
  { key: 'pending',         label: 'Pending' },
  { key: 'processing',      label: 'Processing' },
  { key: 'shipped',         label: 'Shipped' },
  { key: 'out_for_delivery',label: 'Out for Delivery' },
  { key: 'delivered',       label: 'Delivered' },
  { key: 'cancelled',       label: 'Cancelled' },
  { key: 'refunded',        label: 'Refunded' },
]

const STATUS_FLOW = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered']

const STATUS_META = {
  pending:          { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700',  icon: Clock,        dot: 'bg-yellow-400' },
  processing:       { label: 'Processing',        color: 'bg-blue-100 text-blue-700',      icon: Package,      dot: 'bg-blue-400' },
  shipped:          { label: 'Shipped',           color: 'bg-purple-100 text-purple-700',  icon: Truck,        dot: 'bg-purple-400' },
  out_for_delivery: { label: 'Out for Delivery',  color: 'bg-orange-100 text-orange-700',  icon: Truck,        dot: 'bg-orange-400' },
  delivered:        { label: 'Delivered',         color: 'bg-emerald-100 text-emerald-700',icon: CheckCircle,  dot: 'bg-emerald-400' },
  cancelled:        { label: 'Cancelled',         color: 'bg-red-100 text-red-700',        icon: XCircle,      dot: 'bg-red-400' },
  refunded:         { label: 'Refunded',          color: 'bg-gray-100 text-gray-600',      icon: RotateCcw,    dot: 'bg-gray-400' },
}

const CARRIERS = ['Royal Mail', 'DPD', 'Hermes', 'UPS', 'FedEx', 'DHL', 'Parcelforce', 'Yodel', 'Amazon Logistics']

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
      {meta.label}
    </span>
  )
}

// ─── Order Timeline ───────────────────────────────────────────────────────────

function OrderTimeline({ status }) {
  const currentIdx = STATUS_FLOW.indexOf(status)
  const isCancelled = status === 'cancelled' || status === 'refunded'

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 rounded-lg border border-red-100">
        <XCircle size={16} className="text-red-500" />
        <span className="text-sm font-medium text-red-700">
          Order {STATUS_META[status]?.label}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1">
      {STATUS_FLOW.map((step, i) => {
        const meta = STATUS_META[step]
        const done = i <= currentIdx
        const active = i === currentIdx
        const isLast = i === STATUS_FLOW.length - 1

        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                done
                  ? 'bg-[#0066CC] border-[#0066CC]'
                  : 'bg-white border-gray-200'
              }`}>
                <meta.icon size={14} className={done ? 'text-white' : 'text-gray-300'} />
              </div>
              <p className={`text-[10px] font-semibold mt-1.5 text-center w-16 leading-tight ${
                active ? 'text-[#0066CC]' : done ? 'text-gray-700' : 'text-gray-400'
              }`}>
                {meta.label}
              </p>
            </div>
            {!isLast && (
              <div className={`w-12 h-0.5 mb-4 mx-1 ${i < currentIdx ? 'bg-[#0066CC]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Order Detail Page ────────────────────────────────────────────────────────

function OrderDetailPage({ order, onBack, onSave }) {
  const [form, setForm] = useState({
    status: order.status || 'pending',
    tracking_number: order.tracking_number || '',
    carrier: order.carrier || '',
    estimated_delivery: order.estimated_delivery || '',
    admin_notes: order.admin_notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(order.id, form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      
      {/* breadcrumb Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-all px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <ChevronRight size={18} className="rotate-180 text-gray-400 group-hover:text-gray-900 transition-colors" />
            Orders
          </button>
          <span className="text-gray-300 text-lg">/</span>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#00857C]/10 rounded-xl flex items-center justify-center border border-[#00857C]/20">
              <Package size={18} className="text-[#00857C]" />
            </div>
            <h2 className="text-[20px] font-black text-gray-900 tracking-tight">{order.order_number}</h2>
            <StatusBadge status={order.status} />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <p className="text-[12px] font-medium text-gray-400">Order placed on {order.created_at}</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-2.5 rounded-xl text-[14px] font-bold transition-all shadow-lg flex items-center gap-2 ${
              saved
                ? 'bg-green-600 text-white shadow-green-200 scale-105'
                : 'bg-gray-900 hover:bg-black text-white shadow-gray-200'
            } disabled:opacity-60`}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Updating...
              </>
            ) : saved ? (
              <>
                <Check size={16} />
                Changes Saved!
              </>
            ) : 'Save Updates'}
          </button>
        </div>
      </div>

      {/* Full Page Content: Split Layout (50/50) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: Order Items */}
        <div className="space-y-6">
          
          {/* Order items Card */}
          <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                Order Items Summary
                <span className="bg-white text-gray-900 border border-gray-200 text-[11px] px-2.5 py-0.5 rounded-full font-black">{totalItems}</span>
              </h3>
            </div>
            
            <div className="divide-y divide-gray-100 bg-white">
              {order.items?.length > 0 ? order.items.map((item, i) => (
                <div key={i} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group">
                  {/* Small Product Photo */}
                  <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center p-1.5 bg-white">
                    {(item.product?.imageUrl || item.product?.image)
                      ? <img src={item.product.imageUrl || item.product.image} alt="" className="w-full h-full object-contain" />
                      : <Package size={20} className="text-gray-200" />
                    }
                  </div>

                  {/* Simple Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-gray-900 group-hover:text-[#00857C] transition-colors truncate">
                      {item.product?.name || item.product?.shortName || 'Unknown Product'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-gray-400">
                      <span className="text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">Qty: {item.quantity}</span>
                      {item.product?.size && <span>• {item.product.size}</span>}
                      {item.product?.id && <span className="font-mono"># {item.product.id}</span>}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-black text-gray-900">£{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{formatPrice(item.price)} ea</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-gray-50/50">
                  <Package size={48} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">No products listed</p>
                </div>
              )}
            </div>
            
            {/* Simple Total Banner */}
            <div className="p-6 bg-gray-900 text-white flex justify-between items-center rounded-b-[24px]">
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Total Bill</h4>
                <p className="text-[12px] text-gray-400">Inc. Shipping & Taxes</p>
              </div>
              <p className="text-[28px] font-black tracking-tight">£{parseFloat(order.total_amount).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Management & Fulfilment */}
        <div className="space-y-6">
          
          {/* Status & Fulfilment */}
          <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-8">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Manage Fulfilment</h4>
            
            <div className="mb-8 bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <OrderTimeline status={form.status} />
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Order Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-[#0066CC] focus:ring-4 focus:ring-[#0066CC]/5 bg-white transition-all shadow-sm"
                >
                  {STATUSES.filter(s => s.key).map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Carrier</label>
                  <select
                    value={form.carrier}
                    onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none focus:border-[#0066CC] focus:ring-4 focus:ring-[#0066CC]/5 bg-white transition-all shadow-sm"
                  >
                    <option value="">Select —</option>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tracking #</label>
                  <input
                    type="text"
                    value={form.tracking_number}
                    onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-[#0066CC] focus:ring-4 focus:ring-[#0066CC]/5 bg-white transition-all shadow-sm"
                    placeholder="e.g. JB12399..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Detail Card */}
          <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {/* Customer Contact */}
            <div className="p-8">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Customer Profile</h4>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 shadow-inner">
                  <User size={24} className="text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-black text-gray-900 truncate">{order.user_name || order.contact_name}</p>
                  <p className="text-[13px] text-gray-500 truncate">{order.user_email || order.email}</p>
                </div>
              </div>
            </div>

            {/* Shipping details */}
            <div className="p-8">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Shipping Address</h4>
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="text-[14px] text-gray-700 space-y-2">
                  <p className="flex items-start gap-2.5">
                    <MapPin size={16} className="text-gray-400 mt-1 shrink-0" />
                    <span>
                      {order.delivery_contact_name && <span className="font-extrabold text-gray-900 block mb-1">{order.delivery_contact_name}</span>}
                      {order.delivery_street},<br/>
                      {order.delivery_city}, {order.delivery_county}<br/>
                      <span className="font-black text-gray-900 font-mono text-[15px] tracking-widest">{order.delivery_postal_code}</span>
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="p-8">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Internal Notes</h4>
              <textarea
                value={form.admin_notes}
                onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))}
                rows={4}
                placeholder="Type your notes here... (Visible only to admins)"
                className="w-full border-2 border-gray-100 rounded-2xl px-5 py-4 text-[13px] font-medium outline-none focus:border-[#0066CC] focus:ring-4 focus:ring-[#0066CC]/5 bg-white transition-all resize-none shadow-sm"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAllOrders({ status: activeStatus, search })
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [activeStatus, search])

  useEffect(() => { load() }, [load])

  const handleSave = async (id, formData) => {
    const payload = {
      ...formData,
      estimated_delivery: formData.estimated_delivery || null,
    }
    const updated = await updateOrder(id, payload)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o))
    if (selectedOrder?.id === id) setSelectedOrder(prev => ({ ...prev, ...updated }))
    return updated
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.key] = s.key === '' ? orders.length : orders.filter(o => o.status === s.key).length
    return acc
  }, {})

  // If an order is selected, show the full-page detail view
  if (selectedOrder) {
    return (
      <OrderDetailPage
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onSave={handleSave}
      />
    )
  }

  return (
    <div className="animate-in fade-in duration-300">

      {/* Page Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage, track and fulfil customer orders.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 flex-wrap mb-5 bg-white border border-gray-200 rounded-xl p-1.5">
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveStatus(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              activeStatus === s.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s.label}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
              activeStatus === s.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {s.key === '' ? orders.length : orders.filter(o => o.status === s.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order number or customer name…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Order</th>
              <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tracking</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-gray-400">
                  <Package size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-500">No orders found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or search query</p>
                </td>
              </tr>
            ) : orders.map(order => {
              const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0
              return (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-bold text-gray-900 font-mono">{order.order_number}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-medium text-gray-900">{order.user_name || order.contact_name || '—'}</p>
                    <p className="text-[11px] text-gray-400">{order.user_email || ''}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[12px] text-gray-600 whitespace-nowrap">{order.created_at}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] text-gray-700 font-semibold">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                    {order.items?.length > 0 && (
                      <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                        {order.items.map(i => i.product?.name || 'Unknown').join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-bold text-gray-900">£{parseFloat(order.total_amount).toFixed(2)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-4">
                    {order.tracking_number ? (
                      <div>
                        <p className="text-[11px] font-mono text-gray-700">{order.tracking_number}</p>
                        {order.carrier && <p className="text-[10px] text-gray-400">{order.carrier}</p>}
                      </div>
                    ) : (
                      <span className="text-[12px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <ChevronRight size={16} className="text-gray-400" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
