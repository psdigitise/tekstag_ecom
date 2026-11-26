/**
 * AuthContext — cookie-based authentication.
 *
 * Security changes from original:
 *  - localStorage is NEVER used for token storage. The auth token lives
 *    exclusively in an httpOnly cookie set by the server, making it
 *    inaccessible to JavaScript (and therefore to XSS attacks).
 *  - getMe() no longer receives a token argument — the cookie is sent
 *    automatically by the browser via credentials: 'include'.
 *  - logout() calls POST /api/auth/logout/ to invalidate the server-side
 *    token before clearing the client state, so the cookie value becomes
 *    useless even if it somehow persists.
 *  - A global 'auth:expired' event (dispatched by apiFetch on 401) is
 *    listened to here and clears user state, handling token expiry/revocation.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { registerUser, loginUser, logoutUser, getMe } from '../api'
import { BrandLoader } from '../components/Loaders'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session from httpOnly cookie on page load
  useEffect(() => {
    const initAuth = async () => {
      try {
        // getMe() sends credentials: 'include' — the cookie does the auth work
        const data = await getMe()
        setUser(data.user)
      } catch {
        // 401 = no valid session; any other error = treat as unauthenticated
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  // Listen for 401 responses from any API call (e.g. token expired/revoked)
  useEffect(() => {
    const handleExpired = () => setUser(null)
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

  const login = async (email, password) => {
    const data = await loginUser(email, password)
    // Server sets the httpOnly cookie — we only store non-sensitive user info
    setUser(data.user)
    return data.user
  }

  const register = async (userData) => {
    const data = await registerUser(userData)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      // Invalidate the server-side token so the cookie value is no longer valid
      await logoutUser()
    } catch {
      // Even if the server call fails, clear local state
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoggedIn: !!user }}>
      {loading ? <BrandLoader /> : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
