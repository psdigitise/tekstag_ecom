import { Link } from 'react-router-dom'

/**
 * Link for admin-managed storefront content (banners, tiles).
 *   "/category/paper"     -> in-app <Link>
 *   "https://example.com" -> normal <a>
 *   empty                 -> plain <div> (not clickable, no dead "#" links)
 */
export default function ContentLink({ to, className = '', children, ...rest }) {
  const target = (to || '').trim()
  if (target.startsWith('/')) {
    return <Link to={target} className={className} {...rest}>{children}</Link>
  }
  if (/^https?:\/\//i.test(target)) {
    return <a href={target} className={className} {...rest}>{children}</a>
  }
  return <div className={className} {...rest}>{children}</div>
}
