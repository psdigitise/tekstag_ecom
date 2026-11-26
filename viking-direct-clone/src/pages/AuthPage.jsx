/**
 * AuthPage — standalone login / registration page.
 *
 * Security fixes applied:
 *  - Password strength is now validated client-side before submission and
 *    enforced server-side by the backend serializer. Previously any password
 *    (including single characters) was accepted.
 *  - handleLogin and handleRegister properly await the auth calls and only
 *    redirect on success.
 *  - No token is stored in localStorage; AuthContext uses httpOnly cookies.
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle } from 'lucide-react'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export default function AuthPage() {
  const { isLoggedIn, login, register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn) navigate('/home')
  }, [isLoggedIn, navigate])

  const [authMode, setAuthMode] = useState('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regData, setRegData] = useState({
    firstName: '', lastName: '', email: '', password: '', company: '', phone: '',
  })
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      setAuthError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setAuthError('')
    try {
      await login(loginEmail, loginPassword)
      navigate('/home')
    } catch (err) {
      setAuthError(err.message || 'Invalid credentials.')
    } finally {
      setLoading(false)
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
    setLoading(true)
    setAuthError('')
    try {
      await register(regData)
      navigate('/home')
    } catch (err) {
      setAuthError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#F5F5F5] min-h-[80vh] pb-12">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 py-3">
          <nav className="text-[12px] text-gray-500">
            <Link to="/home" className="hover:underline">Home</Link>
            <span className="mx-1.5">›</span>
            <span className="text-gray-900">Sign In / Register</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 pt-10">
        <div className="bg-white rounded-sm p-8">
          <h1 className="text-[26px] font-bold text-gray-900 mb-6">
            {authMode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h1>

          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 mb-5 flex items-center gap-2 text-[13px] text-red-600">
              <AlertCircle size={16} />
              {authError}
            </div>
          )}

          <div className="flex gap-8">
            {/* Login Form */}
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
                    autoComplete="email"
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
                    autoComplete="current-password"
                    className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading && authMode === 'login'}
                  onClick={() => setAuthMode('login')}
                  className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[15px] py-3 rounded-[2px] transition-colors disabled:opacity-50"
                >
                  {loading && authMode === 'login' ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>

            <div className="w-[1px] bg-gray-200 self-stretch" />

            {/* Register Form */}
            <div className={`flex-1 ${authMode === 'login' ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-[18px] font-bold text-gray-800 mb-4">New customer</h2>
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-medium text-gray-700 mb-1 block">First name <span className="text-[#D52B1E]">*</span></label>
                    <input
                      type="text"
                      value={regData.firstName}
                      onChange={(e) => setRegData({...regData, firstName: e.target.value})}
                      autoComplete="given-name"
                      className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-gray-700 mb-1 block">Last name <span className="text-[#D52B1E]">*</span></label>
                    <input
                      type="text"
                      value={regData.lastName}
                      onChange={(e) => setRegData({...regData, lastName: e.target.value})}
                      autoComplete="family-name"
                      className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-gray-700 mb-1 block">Email address <span className="text-[#D52B1E]">*</span></label>
                  <input
                    type="email"
                    value={regData.email}
                    onChange={(e) => setRegData({...regData, email: e.target.value})}
                    autoComplete="email"
                    className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-gray-700 mb-1 block">Password <span className="text-[#D52B1E]">*</span></label>
                  <input
                    type="password"
                    value={regData.password}
                    onChange={(e) => setRegData({...regData, password: e.target.value})}
                    autoComplete="new-password"
                    className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Min 8 characters, must include uppercase, lowercase and a number</p>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-gray-700 mb-1 block">Company name</label>
                  <input
                    type="text"
                    value={regData.company}
                    onChange={(e) => setRegData({...regData, company: e.target.value})}
                    autoComplete="organization"
                    className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-gray-700 mb-1 block">Phone number</label>
                  <input
                    type="tel"
                    value={regData.phone}
                    onChange={(e) => setRegData({...regData, phone: e.target.value})}
                    placeholder="For example: 0123123123"
                    autoComplete="tel"
                    className="w-full border border-gray-300 rounded-[2px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066CC]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading && authMode === 'register'}
                  onClick={() => setAuthMode('register')}
                  className="w-full bg-[#00857C] hover:bg-[#006B63] text-white font-bold text-[15px] py-3 rounded-[2px] transition-colors disabled:opacity-50 mt-4"
                >
                  {loading && authMode === 'register' ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            {authMode === 'login' ? (
              <p className="text-[14px] text-gray-600">
                Don't have an account?{' '}
                <button onClick={() => { setAuthMode('register'); setAuthError('') }} className="text-[#0066CC] hover:underline font-medium">
                  Create one now
                </button>
              </p>
            ) : (
              <p className="text-[14px] text-gray-600">
                Already have an account?{' '}
                <button onClick={() => { setAuthMode('login'); setAuthError('') }} className="text-[#0066CC] hover:underline font-medium">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
