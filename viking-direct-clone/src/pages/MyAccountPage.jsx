import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import ProductImage from '../components/ProductImage'
import { Spinner, SkeletonRows } from '../components/Loaders'
import { useBusy } from '../hooks/useBusy'
import { getProductImage, formatPrice, unavailableReason } from '../utils/product'
import { useCart } from '../context/CartContext'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchMyOrders, fetchInvoiceBlob,
  fetchAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress,
  fetchPaymentMethods, createPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod,
  fetchShoppingLists, createShoppingList,
} from '../api'
import { User, FileText, List as ListIcon, CreditCard, MapPin, Search, Package, X, Check, AlertCircle, Truck, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

// ─── Order tracking helpers ───────────────────────────────────────────────────

const STATUS_FLOW = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered']

const STATUS_META = {
  pending:          { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing:       { label: 'Processing',        color: 'bg-blue-100 text-blue-700',    icon: Package },
  shipped:          { label: 'Shipped',           color: 'bg-purple-100 text-purple-700',icon: Truck },
  out_for_delivery: { label: 'Out for Delivery',  color: 'bg-orange-100 text-orange-700',icon: Truck },
  delivered:        { label: 'Delivered',         color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled:        { label: 'Cancelled',         color: 'bg-red-100 text-red-700',      icon: XCircle },
  refunded:         { label: 'Refunded',          color: 'bg-gray-100 text-gray-600',    icon: RotateCcw },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status?.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function TrackingTimeline({ status }) {
  const currentIdx = STATUS_FLOW.indexOf(status)
  const isCancelled = status === 'cancelled' || status === 'refunded'

  if (isCancelled) {
    const meta = STATUS_META[status]
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 rounded-lg border border-red-100">
        <XCircle size={16} className="text-red-500" />
        <span className="text-sm font-semibold text-red-700">Order {meta?.label}</span>
      </div>
    )
  }

  return (
    <div className="flex items-start overflow-x-auto pb-2">
      {STATUS_FLOW.map((step, i) => {
        const meta = STATUS_META[step]
        const Icon = meta.icon
        const done = i <= currentIdx
        const active = i === currentIdx
        const isLast = i === STATUS_FLOW.length - 1

        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                done ? 'bg-[#00857C] border-[#00857C]' : 'bg-white border-gray-200'
              }`}>
                <Icon size={14} className={done ? 'text-white' : 'text-gray-300'} />
              </div>
              <p className={`text-[10px] font-semibold mt-1.5 text-center w-16 leading-tight ${
                active ? 'text-[#00857C]' : done ? 'text-gray-700' : 'text-gray-400'
              }`}>
                {meta.label}
              </p>
            </div>
            {!isLast && (
              <div className={`w-10 h-0.5 mb-4 mx-1 ${i < currentIdx ? 'bg-[#00857C]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Orders Tab Component ─────────────────────────────────────────────────────

function OrdersTab({ orders, loading, onBrowse }) {
  const [selected, setSelected] = useState(null)

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-sm p-4">
            <div className="h-4 bg-gray-100 rounded w-1/3 mb-3"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h1>
        <div className="border border-gray-200 rounded-sm p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">No orders placed yet</h3>
          <p className="text-gray-500 text-sm max-w-md mb-6">You haven't placed any orders. Start shopping to see your history here.</p>
          <button onClick={onBrowse} className="border-2 border-[#00857C] text-[#00857C] font-bold px-6 py-2 rounded-sm hover:-translate-y-0.5 transition-transform">
            Browse Products
          </button>
        </div>
      </div>
    )
  }

  // ── Detail view ──
  if (selected) {
    const totalItems = selected.items?.reduce((s, i) => s + i.quantity, 0) || 0

    return (
      <div className="animate-in fade-in duration-300">
        {/* Back button */}
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-[#00857C] font-semibold hover:underline mb-5"
        >
          ← Back to orders
        </button>

        {/* Order header */}
        <div className="flex flex-wrap gap-4 items-start justify-between mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Order placed {selected.created_at}</p>
            <h1 className="text-xl font-bold text-gray-900 font-mono">{selected.order_number}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Order total</p>
            <p className="text-xl font-bold text-gray-900">£{parseFloat(selected.total_amount).toFixed(2)}</p>
          </div>
        </div>

        {/* Tracking timeline */}
        <div className="border border-gray-200 rounded-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Shipment Status</h2>
            <StatusBadge status={selected.status} />
          </div>
          <TrackingTimeline status={selected.status} />
        </div>

        {/* Tracking info card — only if tracking number exists */}
        {(selected.tracking_number || selected.carrier || selected.estimated_delivery) && (
          <div className="border border-[#00857C] bg-[#f0faf9] rounded-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck size={16} className="text-[#00857C]" />
              <h2 className="text-sm font-bold text-[#00857C]">Tracking Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {selected.carrier && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Carrier</p>
                  <p className="font-semibold text-gray-800">{selected.carrier}</p>
                </div>
              )}
              {selected.tracking_number && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Tracking Number</p>
                  <p className="font-mono font-bold text-gray-900 text-xs">{selected.tracking_number}</p>
                </div>
              )}
              {selected.estimated_delivery && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Estimated Delivery</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(selected.estimated_delivery).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delivery address */}
        {(selected.delivery_street || selected.delivery_city) && (
          <div className="border border-gray-200 rounded-sm p-5 mb-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Delivery Address</h2>
            <div className="text-sm text-gray-700 space-y-0.5">
              {selected.delivery_contact_name && <p className="font-semibold">{selected.delivery_contact_name}</p>}
              {selected.delivery_street      && <p>{selected.delivery_street}</p>}
              {selected.delivery_city        && <p>{selected.delivery_city}</p>}
              {selected.delivery_county      && <p>{selected.delivery_county}</p>}
              {selected.delivery_postal_code && <p className="font-mono">{selected.delivery_postal_code}</p>}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="border border-gray-200 rounded-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            Items ({totalItems})
          </h2>
          <div className="divide-y divide-gray-100">
            {selected.items?.map((item, i) => (
              <div key={i} className="flex gap-4 items-center py-3 first:pt-0 last:pb-0">
                <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-sm flex items-center justify-center shrink-0">
                  {(item.product?.imageUrl || item.product?.image)
                    ? <img src={item.product.imageUrl || item.product.image} alt="" className="w-full h-full object-contain" />
                    : <Package size={20} className="text-gray-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.product?.name || 'Unknown Product'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.product?.size ? `${item.product.size} · ` : ''}Qty: {item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 shrink-0">£{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
            <span className="text-sm font-semibold text-gray-600">Order Total</span>
            <span className="text-base font-bold text-gray-900">£{parseFloat(selected.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h1>
      <div className="space-y-3">
        {orders.map(order => {
          const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0
          const firstImage = order.items?.find(i => i.product?.imageUrl || i.product?.image)
          const imageSrc = firstImage?.product?.imageUrl || firstImage?.product?.image

          return (
            <button
              key={order.id}
              onClick={() => setSelected(order)}
              className="w-full text-left border border-gray-200 rounded-sm p-4 hover:border-[#00857C] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: thumbnail + info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-sm flex items-center justify-center shrink-0">
                    {imageSrc
                      ? <img src={imageSrc} alt="" className="w-full h-full object-contain" />
                      : <Package size={20} className="text-gray-300" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{order.created_at}</p>
                    <p className="text-sm font-bold text-gray-900 font-mono">{order.order_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Right: total + status + chevron */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm font-bold text-gray-900">£{parseFloat(order.total_amount).toFixed(2)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                  {order.tracking_number && (
                    <div className="hidden sm:flex items-center gap-1 text-[#00857C]">
                      <Truck size={14} />
                      <span className="text-[11px] font-semibold">Tracked</span>
                    </div>
                  )}
                  <span className="text-gray-400 group-hover:text-[#00857C] transition-colors">›</span>
                </div>
              </div>

              {/* Mini status bar for active shipments */}
              {order.status && !['cancelled','refunded'].includes(order.status) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex gap-1">
                    {STATUS_FLOW.map((step, i) => {
                      const currentIdx = STATUS_FLOW.indexOf(order.status)
                      return (
                        <div
                          key={step}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= currentIdx ? 'bg-[#00857C]' : 'bg-gray-200'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {STATUS_META[order.status]?.label || order.status}
                    {order.estimated_delivery && ` · Est. ${new Date(order.estimated_delivery).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyAccountPage() {
  const { user, isLoggedIn, logout } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const { tab } = useParams()
  const [activeTab, setActiveTab] = useState(tab || 'overview')
  const [invoiceQuery, setInvoiceQuery] = useState('')
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [shoppingLists, setShoppingLists] = useState([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [notification, setNotification] = useState(null)
  const [activeList, setActiveList] = useState(null)
  
  // Addresses State
  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [addressForm, setAddressForm] = useState({
    contact_name: '',
    phone: '',
    street: '',
    city: '',
    postal_code: '',
    county: '',
    is_default: false
  })

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    card_type: 'visa',
    last_4: '',
    expiry_month: '',
    expiry_year: '',
    holder_name: '',
    is_default: false
  })

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Sync tab state with URL
  useEffect(() => {
    if (tab) {
      setActiveTab(tab)
    } else {
      setActiveTab('overview')
    }
  }, [tab])

  useEffect(() => {
    if (!isLoggedIn) return
    setLoadingOrders(true)
    fetchMyOrders().then(setOrders).catch(console.error).finally(() => setLoadingOrders(false))
    setLoadingLists(true)
    fetchShoppingLists().then(setShoppingLists).catch(console.error).finally(() => setLoadingLists(false))
    setLoadingAddresses(true)
    fetchAddresses().then(setAddresses).catch(console.error).finally(() => setLoadingAddresses(false))
    setLoadingPayments(true)
    fetchPaymentMethods().then(setPaymentMethods).catch(console.error).finally(() => setLoadingPayments(false))
  }, [isLoggedIn])

  const [saving, runSave] = useBusy()
  const submitOnce = handler => (e) => {
    e.preventDefault()
    runSave(() => handler(e))
  }

  const handleCreateListSubmit = async (e) => {
    e.preventDefault()
    if (!newListName || newListName.trim() === '') return
    try {
      const newList = await createShoppingList(newListName.trim())
      setShoppingLists([newList, ...shoppingLists])
      setShowCreateListModal(false)
      setNewListName('')
      showNotification(`List "${newList.name}" created successfully!`)
    } catch {
      showNotification("Failed to create list", "error")
    }
  }
  const handleAddressSubmit = async (e) => {
    e.preventDefault()
    try {
      const saved = editingAddress
        ? await updateAddress(editingAddress.id, addressForm)
        : await createAddress(addressForm)
      if (editingAddress) {
        setAddresses(addresses.map(a => a.id === saved.id ? saved : (saved.is_default ? { ...a, is_default: false } : a)))
      } else {
        setAddresses(saved.is_default ? [saved, ...addresses.map(a => ({ ...a, is_default: false }))] : [...addresses, saved])
      }
      setShowAddressModal(false)
      setEditingAddress(null)
      setAddressForm({ contact_name: '', phone: '', street: '', city: '', postal_code: '', county: '', is_default: false })
      showNotification(`Address ${editingAddress ? 'updated' : 'added'} successfully!`)
    } catch {
      showNotification("Error saving address", "error")
    }
  }

  const handleDeleteAddress = async (id) => {
    if (!confirm('Are you sure you want to remove this address?')) return
    try {
      await deleteAddress(id)
      setAddresses(addresses.filter(a => a.id !== id))
      showNotification("Address removed")
    } catch {
      showNotification("Error deleting address", "error")
    }
  }

  const handleSetDefaultAddress = async (id) => {
    try {
      await setDefaultAddress(id)
      setAddresses(addresses.map(a => ({ ...a, is_default: a.id === id })))
      showNotification("Default address updated")
    } catch (err) {
      console.error(err)
    }
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    try {
      const saved = await createPaymentMethod(paymentForm)
      setPaymentMethods(saved.is_default ? [saved, ...paymentMethods.map(p => ({ ...p, is_default: false }))] : [...paymentMethods, saved])
      setShowPaymentModal(false)
      setPaymentForm({ card_type: 'visa', last_4: '', expiry_month: '', expiry_year: '', holder_name: '', is_default: false })
      showNotification("Card added successfully!")
    } catch {
      showNotification("Error saving card", "error")
    }
  }

  const handleDeletePayment = async (id) => {
    if (!confirm('Are you sure you want to remove this card?')) return
    try {
      await deletePaymentMethod(id)
      setPaymentMethods(paymentMethods.filter(p => p.id !== id))
      showNotification("Card removed")
    } catch {
      showNotification("Error deleting card", "error")
    }
  }

  const handleSetDefaultPayment = async (id) => {
    try {
      await setDefaultPaymentMethod(id)
      setPaymentMethods(paymentMethods.map(p => ({ ...p, is_default: p.id === id })))
      showNotification("Default payment method updated")
    } catch (err) {
      console.error(err)
    }
  }

  const handleDownloadPDF = async (orderId, orderNumber) => {
    try {
      const blob = await fetchInvoiceBlob(orderId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${orderNumber.replace('ORD-', 'INV-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      showNotification("Invoice download started")
    } catch (err) {
      console.error('Download error:', err)
      showNotification("Error downloading invoice", "error")
    }
  }

  // If not logged in...
  if (!isLoggedIn) {
     return (
       <div className="min-h-[50vh] flex flex-col items-center justify-center bg-gray-50">
         <h2 className="text-2xl font-bold text-gray-800 mb-4">Please sign in to view your account</h2>
         <button onClick={() => navigate('/login')} className="bg-[#D52B1E] text-white px-6 py-2 font-bold rounded-sm hover:bg-[#B82218]">
            Sign In / Register
         </button>
       </div>
     )
  }

  const invoices = orders.filter(o =>
    (o.order_number || '').replace('ORD-', 'INV-').toLowerCase().includes(invoiceQuery.trim().toLowerCase())
  )

  const tabs = [
    { id: 'overview', label: 'Account Overview', icon: User },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'invoices', label: 'Invoice Portal', icon: FileText },
    { id: 'lists', label: 'Shopping Lists', icon: ListIcon },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  ]

  return (
    <div className="bg-[#f0f0f0] min-h-screen py-8">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
               <h2 className="font-bold text-lg text-gray-800">My Account</h2>
               <p className="text-sm text-gray-500 mt-1">Hello, {user?.name || user?.username || 'Customer'}</p>
            </div>
            <nav className="flex flex-col py-2">
               {tabs.map(tabItem => (
                  <button
                    key={tabItem.id}
                    onClick={() => {
                      navigate(`/account/${tabItem.id === 'overview' ? '' : tabItem.id}`);
                      setActiveList(null);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-bold text-left transition-colors border-l-4 ${activeTab === tabItem.id ? 'border-[#D52B1E] bg-red-50 text-[#D52B1E]' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                  >
                    <tabItem.icon size={18} className={activeTab === tabItem.id ? 'text-[#D52B1E]' : 'text-gray-400'} />
                    {tabItem.label}
                  </button>
               ))}
               <div className="my-2 border-t border-gray-200"></div>
               <button onClick={() => { logout(); navigate('/') }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-left text-gray-600 hover:bg-gray-50">
                 Sign Out
               </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          <div className="bg-white border border-gray-200 p-6 shadow-sm min-h-[500px]">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="animate-in fade-in duration-300">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Account Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 p-5 hover:border-[#D52B1E] transition-colors cursor-pointer rounded-sm" onClick={() => setActiveTab('orders')}>
                    <Package size={24} className="text-[#00857C] mb-3" />
                    <h3 className="font-bold text-gray-800 mb-1">My Orders</h3>
                    <p className="text-sm text-gray-500">Track and view your recent and historical orders.</p>
                  </div>
                  <div className="border border-gray-200 p-5 hover:border-[#D52B1E] transition-colors cursor-pointer rounded-sm" onClick={() => setActiveTab('invoices')}>
                    <FileText size={24} className="text-[#00857C] mb-3" />
                    <h3 className="font-bold text-gray-800 mb-1">Invoice Portal</h3>
                    <p className="text-sm text-gray-500">View and download your invoices.</p>
                  </div>
                  <div className="border border-gray-200 p-5 hover:border-[#D52B1E] transition-colors cursor-pointer rounded-sm" onClick={() => setActiveTab('lists')}>
                    <ListIcon size={24} className="text-[#00857C] mb-3" />
                    <h3 className="font-bold text-gray-800 mb-1">Shopping Lists</h3>
                    <p className="text-sm text-gray-500">Manage your saved items and quick re-order lists.</p>
                  </div>
                  <div className="border border-gray-200 p-5 hover:border-[#D52B1E] transition-colors cursor-pointer rounded-sm" onClick={() => setActiveTab('addresses')}>
                    <MapPin size={24} className="text-[#00857C] mb-3" />
                    <h3 className="font-bold text-gray-800 mb-1">Delivery Addresses</h3>
                    <p className="text-sm text-gray-500">Add or edit your shipping destinations.</p>
                  </div>
                </div>
              </div>
            )}

            {/* INVOICE PORTAL TAB */}
            {activeTab === 'invoices' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">Invoice Portal</h1>
                  <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                     <input type="text" value={invoiceQuery} onChange={e => setInvoiceQuery(e.target.value)} placeholder="Search invoices..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-[#00857C]"/>
                  </div>
                </div>
                {loadingOrders ? (
                  <SkeletonRows rows={3} />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="py-3 px-2 font-bold text-gray-700 text-sm">Invoice #</th>
                        <th className="py-3 px-2 font-bold text-gray-700 text-sm">Date</th>
                        <th className="py-3 px-2 font-bold text-gray-700 text-sm">Amount</th>
                        <th className="py-3 px-2 font-bold text-gray-700 text-sm">Status</th>
                        <th className="py-3 px-2 font-bold text-gray-700 text-sm text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 ? (
                        <tr><td colSpan="5" className="py-8 text-center text-sm text-gray-500">No invoices found.</td></tr>
                      ) : invoices.map(order => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                           <td className="py-4 px-2 text-sm text-[#0066CC] font-medium">{order.order_number.replace('ORD-', 'INV-')}</td>
                           <td className="py-4 px-2 text-sm text-gray-600">{order.created_at}</td>
                           <td className="py-4 px-2 text-sm font-bold text-gray-800">£{order.total_amount}</td>
                           <td className="py-4 px-2">
                             <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                               {order.status}
                             </span>
                           </td>
                           <td className="py-4 px-2 text-right">
                             <button
                                onClick={() => handleDownloadPDF(order.id, order.order_number)}
                                className="text-[#00857C] hover:underline text-sm font-bold flex items-center justify-end gap-1 ml-auto"
                             >
                               <FileText size={14} />
                               Download PDF
                             </button>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* MY ORDERS TAB */}
            {activeTab === 'orders' && (
              <OrdersTab
                orders={orders}
                loading={loadingOrders}
                onBrowse={() => navigate('/home')}
              />
            )}

            {/* SHOPPING LISTS TAB */}
            {activeTab === 'lists' && (
              <div className="animate-in fade-in duration-300">
                {activeList ? (
                  <div>
                    <button onClick={() => setActiveList(null)} className="text-[#00857C] hover:underline text-sm font-bold flex items-center gap-1 mb-4">
                      ← Back to Lists
                    </button>
                    <div className="flex justify-between items-center mb-6">
                      <h1 className="text-2xl font-bold text-gray-800">{activeList.name}</h1>
                      <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{activeList.items?.length || 0} items</span>
                    </div>
                    
                    {(!activeList.items || activeList.items.length === 0) ? (
                      <div className="border border-gray-200 rounded-sm p-8 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Package size={28} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">This list is empty</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">Start browsing and click the "+Add to a list" button on any product page.</p>
                        <button onClick={() => navigate('/')} className="border-2 border-[#00857C] text-[#00857C] font-bold px-6 py-2 rounded-sm hover:-translate-y-0.5 transition-transform">
                           Browse Products
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeList.items.map(item => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-200 p-4 rounded-sm hover:shadow-sm transition-shadow bg-white">
                            <ProductImage src={getProductImage(item.product)} alt={item.product?.name} className="w-16 h-16 object-contain shrink-0" placeholderClassName="w-16 h-16 shrink-0 [&>span]:hidden" iconSize={22} />
                            <div className="flex-1 min-w-0">
                               <Link to={`/product/${item.product?.id}`} className="text-[15px] font-bold text-gray-800 hover:text-[#0066CC] line-clamp-2 mb-1">
                                 {item.product?.name || 'Unknown Product'}
                               </Link>
                               {item.product?.sku && <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded mr-2">SKU {item.product.sku}</span>}
                               {item.added_at && <span className="text-xs text-gray-400">Added: {new Date(item.added_at).toLocaleDateString()}</span>}
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-gray-100 sm:border-0">
                               {formatPrice(item.product?.priceExVat) && (
                                 <p className="font-bold text-lg text-gray-900">{formatPrice(item.product.priceExVat)} <span className="text-[11px] font-normal text-gray-400">excl. VAT</span></p>
                               )}
                               <button 
                                 onClick={() => addToCart(item.product, 1)}
                                 disabled={!!unavailableReason(item.product)}
                                 className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-4 py-1.5 text-sm font-bold rounded-[2px] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                               >
                                 {unavailableReason(item.product) || 'Add to basket'}
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h1 className="text-2xl font-bold text-gray-800">Shopping Lists</h1>
                      <button onClick={() => setShowCreateListModal(true)} className="bg-[#00857C] hover:bg-[#006B63] text-white px-4 py-2 font-bold rounded-sm text-sm">
                        + Create New List
                      </button>
                    </div>
                    {loadingLists ? (
                      <SkeletonRows rows={3} />
                    ) : shoppingLists.length === 0 ? (
                      <div className="border border-gray-200 rounded-sm p-6 flex flex-col items-center justify-center text-center">
                         <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <ListIcon size={32} className="text-gray-400" />
                         </div>
                         <h3 className="text-lg font-bold text-gray-800 mb-2">No lists created yet</h3>
                         <p className="text-gray-500 text-sm max-w-md mb-6">Save time by creating shopping lists for items you order frequently. You can create lists for different departments or regular office supplies.</p>
                         <button onClick={() => navigate('/')} className="border-2 border-[#00857C] text-[#00857C] font-bold px-6 py-2 rounded-sm hover:-translate-y-0.5 transition-transform">
                           Browse Products
                         </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shoppingLists.map(list => (
                          <div key={list.id} className="border border-gray-200 rounded-sm p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                               <div className="bg-[#00857C]/10 p-2 rounded-sm">
                                 <ListIcon size={20} className="text-[#00857C]" />
                               </div>
                               <h3 className="font-bold text-gray-800 text-lg line-clamp-1 cursor-pointer hover:text-[#00857C]" onClick={() => setActiveList(list)}>{list.name}</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">{list.items?.length || 0} items saved</p>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                               <span className="text-xs text-gray-400">Created: {list.created_at}</span>
                               <button onClick={() => setActiveList(list)} className="text-[#00857C] font-bold text-[13px] border border-[#00857C] rounded-sm px-3 py-1 hover:bg-[#00857C] hover:text-white transition-colors">View List</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">My Addresses</h1>
                  <button 
                    onClick={() => {
                      setEditingAddress(null);
                      setAddressForm({ contact_name: '', phone: '', street: '', city: '', postal_code: '', county: '', is_default: false });
                      setShowAddressModal(true);
                    }}
                    className="bg-[#00857C] hover:bg-[#006B63] text-white px-4 py-2 font-bold rounded-sm text-sm transition-colors shadow-sm"
                  >
                    + Add New Address
                  </button>
                </div>
                
                {loadingAddresses ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                    {[1,2].map(i => <div key={i} className="h-40 bg-white border border-gray-200 rounded-sm" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map(addr => (
                      <div key={addr.id} className={`border p-5 rounded-sm relative transition-all ${addr.is_default ? 'border-[#00857C] bg-[#fcfcfc] shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        {addr.is_default && (
                          <div className="absolute top-4 right-4 bg-[#00857C] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">Default</div>
                        )}
                        <p className="font-bold text-gray-900 mb-2">{addr.contact_name}</p>
                        <div className="text-sm text-gray-600 space-y-0.5 mb-4">
                          <p>{addr.street}</p>
                          <p>{addr.city}</p>
                          {addr.county && <p>{addr.county}</p>}
                          <p className="font-mono text-gray-900">{addr.postal_code}</p>
                          {addr.phone && <p className="text-gray-400 text-xs pt-1">Tel: {addr.phone}</p>}
                        </div>
                        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                          <button 
                            onClick={() => {
                              setEditingAddress(addr);
                              setAddressForm({ ...addr });
                              setShowAddressModal(true);
                            }}
                            className="text-[13px] font-bold text-[#0066CC] hover:underline"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-[13px] font-bold text-red-600 hover:text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                          {!addr.is_default && (
                            <button 
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[12px] font-medium text-gray-500 hover:text-gray-800 ml-auto border border-gray-200 px-2 py-0.5 rounded-sm hover:bg-gray-50"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div 
                      onClick={() => {
                        setEditingAddress(null);
                        setAddressForm({ contact_name: '', phone: '', street: '', city: '', postal_code: '', county: '', is_default: false });
                        setShowAddressModal(true);
                      }}
                      className="border border-dashed border-gray-300 p-5 rounded-sm flex flex-col items-center justify-center text-center hover:border-[#00857C] hover:bg-white transition-all cursor-pointer group min-h-[160px]"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3 group-hover:bg-[#00857C]/10 transition-colors">
                        <MapPin className="text-gray-300 group-hover:text-[#00857C]" size={24} />
                      </div>
                      <p className="text-sm font-bold text-gray-500 group-hover:text-[#00857C]">Add another address</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYMENT METHODS TAB */}
            {activeTab === 'payments' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">Payment Methods</h1>
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-[#00857C] hover:bg-[#006B63] text-white px-4 py-2 font-bold rounded-sm text-sm transition-colors"
                  >
                    + Add Payment Card
                  </button>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-sm mb-6 flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-yellow-800 leading-relaxed">
                    To keep your business account secure, we only display basic card information. Your full card details are never stored on our servers.
                  </p>
                </div>

                {loadingPayments ? (
                   <div className="space-y-3 animate-pulse">
                      {[1,2].map(i => <div key={i} className="h-20 bg-gray-50 border border-gray-100 rounded-sm" />)}
                   </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {paymentMethods.map(pm => (
                      <div key={pm.id} className={`border p-4 rounded-sm flex items-center justify-between transition-all ${pm.is_default ? 'border-[#00857C] bg-[#fcfcfc]' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <CreditCard size={20} className="text-gray-400" />
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 capitalize">{pm.card_type} ****{pm.last_4}</p>
                                {pm.is_default && (
                                  <span className="bg-[#00857C] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm">Default</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 uppercase">{pm.holder_name} | Exp: {pm.expiry_month}/{pm.expiry_year}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           {!pm.is_default && (
                             <button 
                               onClick={() => handleSetDefaultPayment(pm.id)}
                               className="text-xs font-bold text-gray-500 hover:text-[#00857C]"
                             >
                               Set Default
                             </button>
                           )}
                           <button 
                             onClick={() => handleDeletePayment(pm.id)}
                             className="text-xs font-bold text-red-500 hover:underline"
                           >
                             Remove
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <CreditCard size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">No payment methods saved</h3>
                    <p className="text-gray-500 text-sm max-w-sm mb-6">Save your card details for faster checkout on future orders.</p>
                    <button 
                      onClick={() => setShowPaymentModal(true)}
                      className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-6 py-2 font-bold rounded-sm text-sm transition-colors shadow-sm"
                    >
                      Add Credit/Debit Card
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Create List Modal */}
      {showCreateListModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create New List</h2>
              <button onClick={() => setShowCreateListModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitOnce(handleCreateListSubmit)} className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">List Name</label>
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="e.g. Breakroom Supplies, Office Electronics..."
                className="w-full border border-gray-300 rounded-sm px-3 py-2 mb-6 focus:outline-none focus:border-[#00857C] focus:ring-1 focus:ring-[#00857C]"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateListModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newListName.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#00857C] hover:bg-[#006B63] disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                >
                  {saving && <Spinner size={14} className="inline mr-2 align-[-2px]" />}
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitOnce(handleAddressSubmit)} className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-[13px] font-bold text-gray-700 mb-1">Full Name / Company Name</label>
                  <input
                    type="text"
                    required
                    value={addressForm.contact_name}
                    onChange={e => setAddressForm({ ...addressForm, contact_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[13px] font-bold text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={addressForm.street}
                    onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1">Postcode</label>
                  <input
                    type="text"
                    required
                    value={addressForm.postal_code}
                    onChange={e => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1">County (Optional)</label>
                  <input
                    type="text"
                    value={addressForm.county}
                    onChange={e => setAddressForm({ ...addressForm, county: e.target.value })}
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={addressForm.phone}
                    onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-6">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addressForm.is_default}
                  onChange={e => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="w-4 h-4 text-[#00857C] border-gray-300 rounded focus:ring-[#00857C]"
                />
                <label htmlFor="is_default" className="text-sm text-gray-600">Set as default address</label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-bold text-white bg-[#00857C] hover:bg-[#006B63] rounded-sm shadow-sm"
                >
                  {saving && <Spinner size={14} className="inline mr-2 align-[-2px]" />}
                  {editingAddress ? 'Save Changes' : 'Add Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Payment Card</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitOnce(handlePaymentSubmit)} className="p-5">
              <div className="mb-4">
                 <label className="block text-[13px] font-bold text-gray-700 mb-1">Card Holder Name</label>
                 <input
                    type="text"
                    required
                    value={paymentForm.holder_name}
                    onChange={e => setPaymentForm({ ...paymentForm, holder_name: e.target.value })}
                    placeholder="As shown on card"
                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <div className="col-span-2">
                    <label className="block text-[13px] font-bold text-gray-700 mb-1">Card Number (16 digits)</label>
                    <input
                      type="text"
                      required
                      maxLength="16"
                      placeholder="XXXX XXXX XXXX XXXX"
                      onChange={e => {
                         const val = e.target.value.replace(/\D/g, '');
                         if (val.length >= 4) {
                            setPaymentForm({ ...paymentForm, last_4: val.slice(-4) });
                         }
                      }}
                      className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Only the last 4 digits will be saved for security.</p>
                 </div>
                 <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-1">Expiry Month (MM)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="12"
                      value={paymentForm.expiry_month}
                      onChange={e => setPaymentForm({ ...paymentForm, expiry_month: parseInt(e.target.value) })}
                      placeholder="01"
                      className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                    />
                 </div>
                 <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-1">Expiry Year (YY)</label>
                    <input
                      type="number"
                      required
                      min="24"
                      max="40"
                      value={paymentForm.expiry_year}
                      onChange={e => setPaymentForm({ ...paymentForm, expiry_year: parseInt(e.target.value) })}
                      placeholder="28"
                      className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                    />
                 </div>
                 <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-1">Card Type</label>
                    <select
                      value={paymentForm.card_type}
                      onChange={e => setPaymentForm({ ...paymentForm, card_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#00857C]"
                    >
                       <option value="visa">Visa</option>
                       <option value="mastercard">Mastercard</option>
                       <option value="amex">American Express</option>
                       <option value="maestro">Maestro</option>
                    </select>
                 </div>
                 <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                       <input
                          type="checkbox"
                          id="pm_default"
                          checked={paymentForm.is_default}
                          onChange={e => setPaymentForm({ ...paymentForm, is_default: e.target.checked })}
                          className="w-4 h-4 text-[#00857C] border-gray-300 rounded focus:ring-[#00857C]"
                       />
                       <label htmlFor="pm_default" className="text-xs text-gray-600">Set as default</label>
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || paymentForm.last_4.length < 4}
                  className="px-6 py-2 text-sm font-bold text-white bg-[#00857C] hover:bg-[#006B63] rounded-sm disabled:opacity-50"
                >
                  {saving && <Spinner size={14} className="inline mr-2 align-[-2px]" />}
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-sm shadow-lg flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'error' ? 'bg-[#D52B1E] text-white' : 'bg-[#00857C] text-white'
        }`}>
          {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  )
}
