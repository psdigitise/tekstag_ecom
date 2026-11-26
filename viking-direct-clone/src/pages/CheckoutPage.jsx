/**
 * CheckoutPage — 3-step checkout: auth → billing → delivery/place order.
 *
 * Security fixes applied:
 *  1. handleLogin / handleRegister are now async with proper await and error
 *     handling. Previously the Promise was dropped and setStep(1) ran even on
 *     failed credentials (authentication bypass).
 *  2. Order payload NO LONGER includes total_amount or item prices. The server
 *     looks up all prices from its database; client values are entirely ignored.
 *  3. Applied voucher code is sent to the server for re-validation. The server
 *     recalculates the discount — the client preview is for UX only.
 *  4. The Authorization header and localStorage.getItem('token') are gone.
 *     Auth is via httpOnly cookie sent automatically with credentials:'include'
 *     (handled inside the apiFetch wrapper in api.js).
 *  5. console.error removed from production (dropped by Vite build config).
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { fetchAddresses } from '../api'
import { useBusy } from '../hooks/useBusy'
import { Check, AlertCircle, MapPin, Plus, User, Phone } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export default function CheckoutPage() {
  const { isLoggedIn, user, login, register } = useAuth()
  const {
    items, appliedVoucher, clearCart,
    refreshCart, markUnavailable, hasUnavailableItems,
  } = useCart()
  const navigate = useNavigate()

  const [step, setStep] = useState(isLoggedIn ? 1 : 0)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [placedOrderData, setPlacedOrderData] = useState(null)
  const [isPlacing, setIsPlacing] = useState(false)

  const [authMode, setAuthMode] = useState('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regData, setRegData] = useState({
    firstName: '', lastName: '', email: '', password: '', company: '', phone: '',
  })
  const [authError, setAuthError] = useState('')
  const [authBusy, runAuth] = useBusy()

  const [billing, setBilling] = useState({
    contactName: '', phone: '', postalCode: '', street: '', city: '', county: '',
  })
  const [billingErrors, setBillingErrors] = useState({})

  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false)

  const [delivery, setDelivery] = useState({
    contactName: '', phone: '', postalCode: '', street: '', city: '', county: '',
  })
  const [sameAsBilling, setSameAsBilling] = useState(true)

  // Re-check price and stock when checkout opens. A failed check doesn't block
  // here: the server validates every line again when the order is placed.
  useEffect(() => {
    refreshCart().catch(() => {})
  }, [refreshCart])

  // ── Fetch Addresses ────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoggedIn && step === 1) {
      loadAddresses()
    }
  }, [isLoggedIn, step])

  const loadAddresses = async () => {
    setIsLoadingAddresses(true)
    try {
      const data = await fetchAddresses()
      setSavedAddresses(data)
      if (data.length > 0) {
        // Prefer default address, otherwise first one
        const defaultAddr = data.find(a => a.is_default) || data[0]
        setSelectedAddressId(defaultAddr.id)
        syncBillingWithSaved(defaultAddr)
        setShowAddressForm(false)
      } else {
        setShowAddressForm(true)
      }
    } catch {
      setShowAddressForm(true)
    } finally {
      setIsLoadingAddresses(false)
    }
  }

  const syncBillingWithSaved = (addr) => {
    setBilling({
      contactName: addr.contact_name,
      phone: addr.phone || '',
      postalCode: addr.postal_code,
      street: addr.street,
      city: addr.city,
      county: addr.county || '',
    })
  }

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr.id)
    syncBillingWithSaved(addr)
    setBillingErrors({})
  }

  // ── Step 0: Authentication ─────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      setAuthError('Please fill in all fields.')
      return
    }
    setAuthError('')
    try {
      await runAuth(() => login(loginEmail, loginPassword)) // Must await — previously dropped Promise
      setStep(1)
    } catch (err) {
      setAuthError(err.message || 'Invalid credentials.')
      // Step stays at 0 — user is NOT authenticated
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regData.firstName || !regData.lastName || !regData.email || !regData.password) {
      setAuthError('Please fill in all required fields.')
      return
    }
    if (!PASSWORD_REGEX.test(regData.password)) {
      setAuthError('Password must be at least 8 characters and include uppercase, lowercase, and a number.')
      return
    }
    setAuthError('')
    try {
      await runAuth(() => register(regData)) // Must await — previously dropped Promise
      setStep(1)
    } catch (err) {
      setAuthError(err.message || 'Registration failed.')
      // Step stays at 0
    }
  }

  // ── Step 1: Billing ────────────────────────────────────────────────────────

  const handleBillingSubmit = (e) => {
    e.preventDefault()
    const errors = {}
    if (!billing.contactName.trim()) errors.contactName = 'Required'
    if (!billing.phone.trim()) errors.phone = 'Required'
    if (!billing.postalCode.trim()) errors.postalCode = 'Required'
    if (!billing.street.trim()) errors.street = 'Required'
    if (Object.keys(errors).length > 0) { setBillingErrors(errors); return }
    setBillingErrors({})
    if (sameAsBilling) setDelivery({ ...billing })
    setStep(2)
  }

  // ── Step 2: Place Order ────────────────────────────────────────────────────

  const handleDeliverySubmit = async (e) => {
    e.preventDefault()

    if (items.length === 0) {
      alert('Your cart is empty. Please add items before placing an order.')
      navigate('/home')
      return
    }

    setIsPlacing(true)
    const targetDelivery = sameAsBilling ? billing : delivery

    /**
     * SECURITY: payload contains product IDs and quantities ONLY.
     * - total_amount is NOT sent — server recalculates from the database.
     * - item.price is NOT sent — server looks up price_ex_vat per product.
     * - voucher_code is sent so the server can validate and apply the discount.
     * - Authorization header is NOT set — httpOnly cookie handles authentication.
     */
    const payload = {
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.qty,
        // price intentionally omitted — server is authoritative
      })),
      voucher_code: appliedVoucher?.code || '',

      // Billing address
      contact_name: billing.contactName,
      phone: billing.phone,
      postal_code: billing.postalCode,
      street: billing.street,
      city: billing.city,
      county: billing.county,

      // Delivery address
      delivery_contact_name: targetDelivery.contactName,
      delivery_phone: targetDelivery.phone,
      delivery_postal_code: targetDelivery.postalCode,
      delivery_street: targetDelivery.street,
      delivery_city: targetDelivery.city,
      delivery_county: targetDelivery.county,
    }

    try {
      const res = await fetch(`${API_BASE}/orders/`, {
        method: 'POST',
        credentials: 'include', // sends httpOnly auth_token cookie — no header needed
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setPlacedOrderData(data)
        clearCart()
        setOrderSuccess(true)
        window.scrollTo(0, 0)
      } else {
        const errData = await res.json().catch(() => ({}))
        if (errData.unavailableItems) markUnavailable(errData.unavailableItems)
        const msg = errData.error || errData.detail || 'Please check your details and try again.'
        alert(`Failed to place the order: ${msg}`)
      }
    } catch {
      alert('Network error. Please check your connection and try again.')
    } finally {
      setIsPlacing(false)
    }
  }

  const steps = [
    { label: 'About you', num: 1 },
    { label: 'Billing details', num: 2 },
    { label: 'Delivery Address', num: 3 },
  ]

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-12">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 py-3">
          <nav className="text-[12px] text-gray-500">
            <Link to="/home" className="hover:underline">Home</Link>
            <span className="mx-1.5">›</span>
            <span className="text-gray-900">Registration</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 pt-6">

        {!orderSuccess && hasUnavailableItems && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 mb-5 text-[13px] text-red-700">
            <p className="font-bold flex items-center gap-2">
              <AlertCircle size={16} /> Some items in your basket can't be ordered.
            </p>
            <ul className="mt-1 ml-6 list-disc">
              {items.filter(i => i.issue).map(i => (
                <li key={i.product.id}>{i.product.name}: {i.issue}</li>
              ))}
            </ul>
            <Link to="/cart" className="inline-block mt-2 font-bold underline">Review basket</Link>
          </div>
        )}

        {orderSuccess ? (
          <div className="bg-white rounded-sm shadow-sm border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500 mb-20">
            <div className="bg-[#00857C] p-6 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
                <Check size={32} strokeWidth={3} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Order Placed Successfully!</h1>
              <p className="text-white/80 text-[15px]">Thank you for your business. We've received your order.</p>
            </div>

            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-gray-50 border border-gray-100 p-5 rounded-sm mb-8">
                <div>
                  <p className="text-[12px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Order Number</p>
                  <p className="text-lg font-mono font-bold text-gray-900">{placedOrderData?.order_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Delivery To</h3>
                  <div className="text-[14px] text-gray-600 space-y-0.5">
                    <p className="font-bold text-gray-800">{placedOrderData?.delivery_contact_name}</p>
                    <p>{placedOrderData?.delivery_street}</p>
                    <p>{placedOrderData?.delivery_city}, {placedOrderData?.delivery_postal_code}</p>
                  </div>
                </div>
                <div className="bg-[#f0faf9] border border-[#00857C]/20 p-4 rounded-sm">
                  <h3 className="text-sm font-bold text-[#00857C] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} /> Confirmation
                  </h3>
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    Your order has been recorded. You can follow its status in your account area.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
                <Link
                  to="/account"
                  className="bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-center py-3 px-8 rounded-[2px] flex-1 transition-all"
                >
                  View Order Status
                </Link>
                <Link
                  to="/home"
                  className="border-2 border-gray-200 text-gray-700 hover:border-gray-300 font-bold text-center py-2.5 px-8 rounded-[2px] flex-1 transition-all"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="flex items-center mb-8">
              {steps.map((s, idx) => {
                const isCompleted = step > idx
                const isActive = step === idx
                return (
                  <div key={idx} className="flex-1 flex flex-col items-start relative">
                    <div className="w-full flex items-center mb-2">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <div className="w-6 h-6 bg-[#00857C] rounded-full flex items-center justify-center flex-shrink-0">
                            <Check size={14} strokeWidth={3} className="text-white" />
                          </div>
                        ) : isActive ? (
                          <div className="w-6 h-6 bg-[#0066CC] rounded-full flex items-center justify-center flex-shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[12px] font-bold">{s.num}</span>
                          </div>
                        )}
                        <span className={`text-[14px] whitespace-nowrap ${isCompleted ? 'text-[#00857C] font-medium' : isActive ? 'text-[#0066CC] font-bold' : 'text-gray-400'}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                    <div className={`h-[3px] w-full ${isCompleted ? 'bg-[#00857C]' : isActive ? 'bg-[#0066CC]' : 'bg-gray-200'}`} />
                  </div>
                )
              })}
            </div>

            {/* Step 0: Auth */}
            {step === 0 && (
              <div className="bg-white rounded-sm p-8">
                <h1 className="text-[26px] font-bold text-gray-900 mb-6">
                  {authMode === 'login' ? 'Sign in to continue' : 'Create your account'}
                </h1>

                {authError && (
                  <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 mb-5 flex items-center gap-2 text-[13px] text-red-600">
                    <AlertCircle size={16} />
                    {authError}
                  </div>
                )}

                <div className="flex gap-8">
                  {/* Login */}
                  <div className={`flex-1 ${authMode === 'register' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h2 className="text-[18px] font-bold text-gray-800 mb-4">Returning customer</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1 block">
                          Email address <span className="text-[#D52B1E]">*</span>
                        </label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1 block">
                          Password <span className="text-[#D52B1E]">*</span>
                        </label>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                        />
                      </div>
                      <button
                        type="submit"
                        onClick={() => setAuthMode('login')}
                        disabled={authBusy}
                        className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[15px] py-3 rounded-[2px] transition-colors"
                      >
                        {authBusy && authMode === 'login' ? 'Signing in…' : 'Sign in'}
                      </button>
                    </form>
                  </div>

                  <div className="w-[1px] bg-gray-200 self-stretch" />

                  {/* Register */}
                  <div className={`flex-1 ${authMode === 'login' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h2 className="text-[18px] font-bold text-gray-800 mb-4">New customer</h2>
                    <form onSubmit={handleRegister} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[13px] font-medium text-gray-700 mb-1 block">First name <span className="text-[#D52B1E]">*</span></label>
                          <input type="text" value={regData.firstName} onChange={(e) => setRegData({...regData, firstName: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-gray-700 mb-1 block">Last name <span className="text-[#D52B1E]">*</span></label>
                          <input type="text" value={regData.lastName} onChange={(e) => setRegData({...regData, lastName: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1 block">Email address <span className="text-[#D52B1E]">*</span></label>
                        <input type="email" value={regData.email} onChange={(e) => setRegData({...regData, email: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1 block">Password <span className="text-[#D52B1E]">*</span></label>
                        <input type="password" value={regData.password} onChange={(e) => setRegData({...regData, password: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                        <p className="text-[11px] text-gray-400 mt-1">Min 8 chars, uppercase, lowercase & number</p>
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1 block">Company name</label>
                        <input type="text" value={regData.company} onChange={(e) => setRegData({...regData, company: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1 block">Phone number</label>
                        <input type="tel" value={regData.phone} onChange={(e) => setRegData({...regData, phone: e.target.value})} placeholder="For example: 0123123123" className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                      <button
                        type="submit"
                        onClick={() => setAuthMode('register')}
                        disabled={authBusy}
                        className="w-full bg-[#00857C] hover:bg-[#006B63] text-white font-bold text-[15px] py-3 rounded-[2px] transition-colors"
                      >
                        {authBusy && authMode === 'register' ? 'Creating account…' : 'Create account'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  {authMode === 'login' ? (
                    <p className="text-[14px] text-gray-600">
                      Don't have an account?{' '}
                      <button onClick={() => setAuthMode('register')} className="text-[#0066CC] hover:underline font-medium">Create one now</button>
                    </p>
                  ) : (
                    <p className="text-[14px] text-gray-600">
                      Already have an account?{' '}
                      <button onClick={() => setAuthMode('login')} className="text-[#0066CC] hover:underline font-medium">Sign in</button>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Billing */}
            {step === 1 && (
              <div className="bg-white rounded-sm p-8">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-[26px] font-bold text-gray-900">Billing</h1>
                  {savedAddresses.length > 0 && (
                    <button
                      onClick={() => setShowAddressForm(!showAddressForm)}
                      className="text-[14px] text-[#0066CC] hover:underline font-medium flex items-center gap-1"
                    >
                      {showAddressForm ? 'Select saved address' : 'Add new address'}
                    </button>
                  )}
                </div>

                {isLoadingAddresses ? (
                  <div className="py-12 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC]"></div>
                  </div>
                ) : (
                  <form onSubmit={handleBillingSubmit}>
                    {!showAddressForm && savedAddresses.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {savedAddresses.map((addr) => (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectAddress(addr)}
                            className={`relative border-2 rounded-sm p-4 cursor-pointer transition-all ${
                              selectedAddressId === addr.id
                                ? 'border-[#0066CC] bg-blue-50/30'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {selectedAddressId === addr.id && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-[#0066CC] rounded-full flex items-center justify-center">
                                <Check size={12} className="text-white" strokeWidth={3} />
                              </div>
                            )}
                            <div className="flex items-start gap-3">
                              <MapPin size={18} className={selectedAddressId === addr.id ? 'text-[#0066CC]' : 'text-gray-400'} />
                              <div className="text-[14px]">
                                <p className="font-bold text-gray-900 mb-1">{addr.contact_name}</p>
                                <p className="text-gray-600 leading-relaxed">
                                  {addr.street}<br />
                                  {addr.city}, {addr.postal_code}<br />
                                  {addr.county}
                                </p>
                                {addr.phone && (
                                  <p className="text-gray-500 mt-2 flex items-center gap-1.5 text-[12px]">
                                    <Phone size={12} /> {addr.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                            {addr.is_default && (
                              <span className="absolute bottom-3 right-3 text-[10px] font-bold text-[#00857C] bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Default</span>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setShowAddressForm(true)}
                          className="border-2 border-dashed border-gray-200 rounded-sm p-6 flex flex-col items-center justify-center gap-2 hover:border-[#0066CC] hover:bg-blue-50/20 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#0066CC]/10 transition-colors">
                            <Plus size={20} className="text-gray-400 group-hover:text-[#0066CC]" />
                          </div>
                          <span className="text-[14px] font-medium text-gray-500 group-hover:text-[#0066CC]">Add a new address</span>
                        </button>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-sm p-6 mb-6">
                        <h2 className="text-[16px] font-bold text-gray-800 mb-5 flex items-center gap-2">
                          <MapPin size={18} className="text-[#0066CC]" />
                          {savedAddresses.length > 0 ? 'New Billing Address' : 'Billing Address'}
                        </h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Contact Name: <span className="text-[#D52B1E]">*</span></label>
                            <input type="text" value={billing.contactName} onChange={(e) => setBilling({...billing, contactName: e.target.value})} className={`w-full border rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC] ${billingErrors.contactName ? 'border-[#D52B1E]' : 'border-gray-300'}`} />
                            {billingErrors.contactName && <p className="text-[12px] text-[#D52B1E] mt-1 font-medium">Required</p>}
                          </div>
                          <div>
                            <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Phone number <span className="text-[#D52B1E]">*</span></label>
                            <input type="tel" value={billing.phone} onChange={(e) => setBilling({...billing, phone: e.target.value})} placeholder="For example: 0123123123" className={`w-full border rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC] ${billingErrors.phone ? 'border-[#D52B1E]' : 'border-gray-300'}`} />
                            {billingErrors.phone && <p className="text-[12px] text-[#D52B1E] mt-1 font-medium">Required</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Postal code <span className="text-[#D52B1E]">*</span></label>
                            <input type="text" value={billing.postalCode} onChange={(e) => setBilling({...billing, postalCode: e.target.value})} placeholder="e.g. AB1 1AZ" className={`w-full border rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC] ${billingErrors.postalCode ? 'border-[#D52B1E]' : 'border-gray-300'}`} />
                            {billingErrors.postalCode && <p className="text-[12px] text-[#D52B1E] mt-1 font-medium">Required</p>}
                          </div>
                          <div>
                            <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Building or house number and street name <span className="text-[#D52B1E]">*</span></label>
                            <input type="text" value={billing.street} onChange={(e) => setBilling({...billing, street: e.target.value})} placeholder="e.g. Building name or 1 Mainstreet" className={`w-full border rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC] ${billingErrors.street ? 'border-[#D52B1E]' : 'border-gray-300'}`} />
                            {billingErrors.street && <p className="text-[12px] text-[#D52B1E] mt-1 font-medium">Required</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">City</label>
                            <input type="text" value={billing.city} onChange={(e) => setBilling({...billing, city: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                          </div>
                          <div>
                            <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">County</label>
                            <input type="text" value={billing.county} onChange={(e) => setBilling({...billing, county: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                          </div>
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-2.5 mb-6 cursor-pointer">
                      <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="w-4 h-4 accent-[#0066CC]" />
                      <span className="text-[14px] text-gray-700">Delivery address same as billing address</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <button type="submit" className="bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[15px] px-8 py-3 rounded-[2px] transition-colors">Continue to delivery</button>
                      <button type="button" onClick={() => setStep(0)} className="text-[14px] text-[#0066CC] hover:underline font-medium">Back</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Step 2: Delivery + Place Order */}
            {step === 2 && (
              <div className="bg-white rounded-sm p-8">
                <h1 className="text-[26px] font-bold text-gray-900 mb-6">Delivery Address</h1>
                {sameAsBilling ? (
                  <div className="border border-gray-200 rounded-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Check size={18} className="text-[#00857C]" />
                      <p className="text-[14px] text-gray-700 font-medium">Delivery address is the same as billing address</p>
                    </div>
                    <div className="bg-[#F9F9F9] rounded-sm p-4 text-[13px] text-gray-600 space-y-1">
                      <p className="font-medium text-gray-800">{billing.contactName}</p>
                      <p>{billing.street}</p>
                      <p>{billing.city} {billing.county}</p>
                      <p>{billing.postalCode}</p>
                      <p>{billing.phone}</p>
                    </div>
                    <button onClick={() => setSameAsBilling(false)} className="text-[13px] text-[#0066CC] hover:underline mt-3 font-medium">Use a different delivery address</button>
                  </div>
                ) : (
                  <form className="border border-gray-200 rounded-sm p-6 mb-6">
                    <h2 className="text-[16px] font-bold text-gray-800 mb-5">Delivery Address</h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Contact Name: <span className="text-[#D52B1E]">*</span></label>
                        <input type="text" value={delivery.contactName} onChange={(e) => setDelivery({...delivery, contactName: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Phone number <span className="text-[#D52B1E]">*</span></label>
                        <input type="tel" value={delivery.phone} onChange={(e) => setDelivery({...delivery, phone: e.target.value})} placeholder="For example: 0123123123" className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Postal code <span className="text-[#D52B1E]">*</span></label>
                        <input type="text" value={delivery.postalCode} onChange={(e) => setDelivery({...delivery, postalCode: e.target.value})} placeholder="e.g. AB1 1AZ" className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Building or house number and street name <span className="text-[#D52B1E]">*</span></label>
                        <input type="text" value={delivery.street} onChange={(e) => setDelivery({...delivery, street: e.target.value})} placeholder="e.g. Building name or 1 Mainstreet" className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">City</label>
                        <input type="text" value={delivery.city} onChange={(e) => setDelivery({...delivery, city: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">County</label>
                        <input type="text" value={delivery.county} onChange={(e) => setDelivery({...delivery, county: e.target.value})} className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]" />
                      </div>
                    </div>
                  </form>
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleDeliverySubmit}
                    disabled={isPlacing || hasUnavailableItems}
                    className={`bg-[#D52B1E] hover:bg-[#B71C1C] text-white font-bold text-[15px] px-8 py-3 rounded-[2px] transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {isPlacing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Placing order...
                      </>
                    ) : 'Place order'}
                  </button>
                  <button onClick={() => setStep(1)} className="text-[14px] text-[#0066CC] hover:underline font-medium">Back to billing</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
