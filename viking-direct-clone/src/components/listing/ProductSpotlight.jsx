import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ShoppingCart } from 'lucide-react'
import ProductImage from '../ProductImage'
import { SkeletonRows } from '../Loaders'
import { fetchProducts, fetchProductImages } from '../../api'
import { useCart } from '../../context/CartContext'
import { formatPrice, getProductImage, normalizeProduct, unavailableReason } from '../../utils/product'

/**
 * Wide layout used when a listing has exactly one product: photos, description,
 * highlights and every size with its price.
 */
export default function ProductSpotlight({ product }) {
  const { addToCart } = useCart()
  const [sizes, setSizes] = useState(product.variantCount > 1 ? null : [product])
  const [photos, setPhotos] = useState([])
  const [chosen, setChosen] = useState(null)

  useEffect(() => {
    let cancelled = false
    setChosen(null)
    fetchProductImages(product.id)
      .then(list => { if (!cancelled) setPhotos(list.map(p => p.url)) })
      .catch(() => {})
    if (product.groupCode) {
      fetchProducts({ group: product.groupCode })
        .then(list => { if (!cancelled) setSizes(list.map(normalizeProduct)) })
        .catch(() => { if (!cancelled) setSizes([product]) })
    } else {
      setSizes([product])
    }
    return () => { cancelled = true }
  }, [product.id])

  const main = getProductImage(product)
  const gallery = [...new Set([main, ...photos].filter(Boolean))].slice(0, 5)
  const highlights = (product.keyAttributes || '').split('\n').filter(Boolean)
  const link = `/product/${product.id}`
  const single = sizes?.length === 1 ? sizes[0] : null

  return (
    <article className="grid grid-cols-1 lg:grid-cols-2 gap-8 border border-gray-200 rounded-xl bg-white p-5 md:p-7 shadow-sm">
      <div>
        <Link to={link} className="group flex items-center justify-center h-[360px] rounded-lg bg-gray-50 overflow-hidden p-5">
          <ProductImage key={chosen || main} src={chosen || main} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" placeholderClassName="w-full h-full" iconSize={44} />
        </Link>
        {gallery.length > 1 && (
          <div className="flex gap-2 mt-3">
            {gallery.map((url, i) => (
              <button key={url} type="button" onClick={() => setChosen(url)} aria-label={`Show photo ${i + 1}`}
                className={`w-16 h-16 rounded-md border p-1 bg-white ${url === (chosen || main) ? 'border-[#0066CC] ring-1 ring-[#0066CC]' : 'border-gray-200 hover:border-gray-400'}`}>
                <img src={url} alt="" loading="lazy" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col">
        {product.brandName && <p className="text-[12px] font-bold uppercase tracking-wider text-[#00857C]">{product.brandName}</p>}
        <h2 className="text-[24px] font-black text-gray-900 leading-tight mt-1">
          <Link to={link} className="hover:text-[#0066CC]">{product.name}</Link>
        </h2>
        {product.description && <p className="text-[13px] text-gray-600 leading-relaxed mt-3 line-clamp-3 whitespace-pre-line">{product.description}</p>}

        {highlights.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-4">
            {highlights.map(item => (
              <li key={item} className="flex items-start gap-2 text-[13px] text-gray-700">
                <Check size={15} strokeWidth={3} className="text-[#0066CC] mt-0.5 flex-shrink-0" />{item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          {!sizes ? <SkeletonRows rows={3} /> : (
            <table className="w-full text-[13px] border border-gray-200 rounded-md overflow-hidden">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="py-2 px-3 font-semibold">Size</th>
                  <th className="py-2 px-3 font-semibold">Unit</th>
                  <th className="py-2 px-3 font-semibold text-right">Price excl. VAT</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map(size => (
                  <tr key={size.id} className="border-t border-gray-100 hover:bg-[#F0F7FF]">
                    <td className="py-2 px-3">
                      <Link to={`/product/${size.id}`} className="font-bold text-[#0066CC] hover:underline">{size.size || size.sku}</Link>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{size.unitInfo}</td>
                    <td className="py-2 px-3 text-right font-black text-gray-900">{formatPrice(size.priceExVat) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          {single && !unavailableReason(single) && (
            <button type="button" onClick={() => addToCart(single, 1)} className="inline-flex items-center gap-2 bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-[14px] px-6 py-3 rounded-sm">
              <ShoppingCart size={17} /> Add to basket
            </button>
          )}
          <Link to={link} className={`group inline-flex items-center gap-2 font-bold text-[14px] px-6 py-3 rounded-sm ${single ? 'border border-gray-300 text-gray-800 hover:border-gray-500' : 'bg-[#0066CC] hover:bg-[#0052A3] text-white'}`}>
            {single ? 'View details' : 'View details and choose size'}
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  )
}
