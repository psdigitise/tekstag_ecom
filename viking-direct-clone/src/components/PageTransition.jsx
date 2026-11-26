import { Outlet, useLocation } from 'react-router-dom'

// Pages that update in place when only the last part of the address changes.
const KEEP_MOUNTED = ['/product', '/account']

/** Each new page fades and rises gently into view. */
export default function PageTransition() {
  const { pathname } = useLocation()
  const key = KEEP_MOUNTED.find(base => pathname === base || pathname.startsWith(`${base}/`)) || pathname

  return (
    <div key={key} className="page-enter">
      <Outlet />
    </div>
  )
}
