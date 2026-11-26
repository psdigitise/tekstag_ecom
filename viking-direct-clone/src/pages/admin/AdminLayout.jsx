/**
 * AdminLayout — shell for all /admin/* routes.
 *
 * Security fix applied:
 *  - Previously only checked isLoggedIn, meaning ANY authenticated customer
 *    could access the full admin panel (product CRUD, user data, order management).
 *  - Now checks user.is_staff (set server-side; never writable by the client).
 *  - The is_staff flag comes from the /api/auth/me/ response and is stored in
 *    AuthContext.user — it is never read from localStorage or client storage.
 *
 * IMPORTANT: This is a UX guard only. The backend enforces IsAdminStaff on
 * every admin endpoint independently. A frontend bypass grants nothing because
 * the API will return 403 for every admin operation.
 */
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, LogOut,
  Grid, MonitorPlay, Bell, Search, Settings, ShoppingBag, Ticket,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import PageTransition from '../../components/PageTransition'

export default function AdminLayout() {
  const { user, isLoggedIn, login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const loggedInUser = await login(email, password)
      // After login, check if the newly authenticated user is staff
      if (!loggedInUser?.is_staff) {
        await logout()
        setError('You do not have admin privileges.')
      }
    } catch {
      setError('Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  // ── Gate 1: Not logged in → show login form ─────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center font-sans">
        <div className="bg-white p-10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[400px] border border-gray-100">
          <div className="text-center mb-8">
            <img src="/tekstag-logo.png" alt="Tekstag" className="h-10 w-auto mx-auto mb-1" />
            <h2 className="text-sm font-semibold text-gray-500 tracking-wide uppercase">Workspace Admin</h2>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm font-medium mb-6">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 p-2.5 rounded-lg focus:border-[#D52B1E] focus:ring-1 focus:ring-[#D52B1E] outline-none transition-colors text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 p-2.5 rounded-lg focus:border-[#D52B1E] focus:ring-1 focus:ring-[#D52B1E] outline-none transition-colors text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#111827] hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 text-sm disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="text-center mt-6 pt-6 border-t border-gray-100">
            <Link to="/home" className="text-[#0066CC] hover:underline text-[13px] font-medium">← Back to Storefront</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Gate 2: Logged in but NOT staff → access denied ─────────────────────────
  // This block is reached if a regular customer navigates to /admin directly.
  if (!user?.is_staff) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center font-sans">
        <div className="bg-white p-10 rounded-xl shadow-sm w-full max-w-[400px] border border-gray-100 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-6">
            You do not have permission to access the admin area.
          </p>
          <Link
            to="/home"
            className="inline-block bg-[#0066CC] hover:bg-[#0052A3] text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Back to Storefront
          </Link>
        </div>
      </div>
    )
  }

  // ── Gate 3: Authenticated staff → render admin layout ───────────────────────
  const navItems = [
    { label: 'Overview',      path: '/admin',             icon: LayoutDashboard },
    { label: 'Orders',        path: '/admin/orders',      icon: ShoppingBag },
    { label: 'Catalog',       path: '/admin/products',    icon: Package },
    { label: 'Categories',    path: '/admin/categories',  icon: Grid },
    { label: 'Storefront UI', path: '/admin/storefront',  icon: MonitorPlay },
    { label: 'Store Settings', path: '/admin/settings',   icon: Settings },
    { label: 'Vouchers',      path: '/admin/vouchers',    icon: Ticket },
    { label: 'User Base',     path: '/admin/users',       icon: Users },
  ]

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex font-sans text-gray-900">
      <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
          <Link to="/home" className="flex items-center gap-2">
            <img src="/tekstag-logo.png" alt="Tekstag" className="h-7 w-auto" />
            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded ml-1">ADMIN</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-3">
          <p className="px-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-3">Menu</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.includes(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-[14px] font-medium ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-gray-900' : 'text-gray-400'} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.username ? user.username[0].toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-bold text-gray-900 truncate">{user?.username || 'Administrator'}</p>
              <p className="text-[12px] text-gray-500 truncate">Staff</p>
            </div>
          </div>
          <button
            onClick={async () => { await logout(); navigate('/home') }}
            className="flex w-full items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-[13px] font-medium"
          >
            <LogOut size={16} className="text-gray-400" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F9FAFB]">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 justify-between shrink-0 z-10">
          <div className="flex items-center gap-4 text-gray-500">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search across workspace..."
              className="border-none outline-none text-sm w-64 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-gray-600 transition-colors"><Bell size={18} /></button>
            <button className="text-gray-400 hover:text-gray-600 transition-colors"><Settings size={18} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 text-gray-900">
          <div className="max-w-6xl mx-auto">
            <PageTransition />
          </div>
        </div>
      </main>
    </div>
  )
}
