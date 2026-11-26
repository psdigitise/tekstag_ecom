import { useState, useEffect, useCallback } from 'react'
import { fetchProducts, fetchCategories, createProduct, updateProduct, deleteProduct } from '../../api'
import { Edit2, Trash2, Plus, X, Filter } from 'lucide-react'
import { useCategories } from '../../context/CategoriesContext'
import Pagination from '../../components/Pagination'
import { Spinner, Skeleton } from '../../components/Loaders'
import { useBusy } from '../../hooks/useBusy'
import GalleryManager from './GalleryManager'
import { useSiteSettings } from '../../context/SettingsContext'
import { getPricing } from '../../utils/storeSettings'
import { formatPrice, categoryLabel } from '../../utils/product'

const ADMIN_PAGE_SIZE = 25

const STOCK_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'Currently in stock', label: 'Currently in stock' },
  { value: 'Low stock', label: 'Low stock' },
  { value: 'Out of stock', label: 'Out of stock' },
  { value: 'Available to order', label: 'Available to order' },
]

// Badge and eco values match the client's product data template
// (Badges: buyMore | promo | sale | new; Eco: Sustainable | Recycled | Carbon Neutral).
const BADGE_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'Buy More, Save More', label: 'Buy More, Save More' },
  { value: 'promo', label: 'Promo price' },
  { value: 'sale', label: 'Sale' },
  { value: 'new', label: 'New' },
]

const ECO_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'Sustainable', label: 'Sustainable' },
  { value: 'Recycled', label: 'Recycled' },
  { value: 'Carbon Neutral', label: 'Carbon Neutral' },
]

const SECTION_OPTIONS = [
  { value: 'listing', label: 'Normal Listing' },
  { value: 'viewed', label: 'Recently Viewed Area' },
  { value: 'bought', label: 'Top Selling Area' },
  { value: 'recommendation', label: 'Recommended Area' },
]

// If a product was imported with a value that isn't in the dropdown (e.g. badge
// "buyMore"), keep it selectable so editing the product doesn't silently change it.
function withCurrent(options, value) {
  if (!value || options.some(o => o.value === value)) return options
  return [...options, { value, label: `${value} (current value)` }]
}

const EMPTY_FORM = {
  name: '',
  sku: '',
  brandName: '',
  priceExVat: '',
  priceIncVat: '',
  unitInfo: '',
  weight: '',
  badge: '',
  ecoBadge: '',
  stockStatus: '',
  deliveryText: '',
  image: '',
  section: 'listing',
  categoryId: '',
  shortName: '',
  bulkFrom: '',
  description: '',
  keyAttributes: '',
  size: '',
  colour: '',
  thickness: '',
  weightText: '',
  groupCode: '',
}

// Text details shown on the product page. [field, label, placeholder]
const DETAIL_FIELDS = [
  ['size', 'Size', 'e.g. 30*40cm'],
  ['colour', 'Colour', 'e.g. transparent'],
  ['thickness', 'Thickness', 'e.g. 50mic'],
  ['weightText', 'Weight (as displayed)', 'e.g. 780g/pack'],
  ['bulkFrom', 'Bulk From', 'e.g. 100pcs'],
  ['groupCode', 'Group code', 'Same code = sizes of one product'],
  ['shortName', 'Short name', 'Used on homepage cards'],
]

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  // Category product counts / lowest prices shown on the storefront change with products.
  const { reload: reloadStorefrontCategories } = useCategories()

  const [activeCategoryFilter, setActiveCategoryFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')   // debounced copy of searchInput
  const [page, setPage] = useState(1)
  const [pageInfo, setPageInfo] = useState({ count: 0, totalPages: 1 })
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== search) { setSearch(searchInput.trim()); setPage(1) }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, search])

  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  const [formData, setFormData] = useState(EMPTY_FORM)

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))

  const { settings } = useSiteSettings()
  const { vatRate } = getPricing(settings)
  // Typing the ex-VAT price fills in the inc-VAT price; it can still be changed.
  const setPriceExVat = (e) => {
    const value = e.target.value
    const inc = value === '' ? '' : String(Number((Number(value) * (1 + vatRate / 100)).toFixed(4)))
    setFormData(prev => ({ ...prev, priceExVat: value, priceIncVat: inc }))
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [prodData, catData] = await Promise.all([
        fetchProducts({ category: activeCategoryFilter, search, page, page_size: ADMIN_PAGE_SIZE }),
        fetchCategories()
      ])
      setProducts(prodData.results)
      setPageInfo({ count: prodData.count, totalPages: prodData.totalPages })
      // The server returns the last page if we asked past the end (e.g. after a delete).
      if (prodData.page !== page) setPage(prodData.page)
      setCategories(catData)
    } catch (err) {
      console.error(err)
      setLoadError(err.message || 'Could not load products.')
    } finally {
      setLoading(false)
    }
  }, [activeCategoryFilter, search, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenModal = (product = null) => {
    setImageFile(null)
    if (product) {
      setEditingProduct(product.id)
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        brandName: product.brandName || '',
        priceExVat: product.priceExVat || '',
        priceIncVat: product.priceIncVat || '',
        unitInfo: product.unitInfo || '',
        weight: product.weight || '',
        badge: product.badge || '',
        ecoBadge: product.ecoBadge || '',
        stockStatus: product.stockStatus || '',
        deliveryText: product.deliveryText || '',
        image: product.image || '',
        section: product.section || 'listing',
        categoryId: product.category?.id || '',
        shortName: product.shortName || '',
        bulkFrom: product.bulkFrom || '',
        description: product.description || '',
        keyAttributes: product.keyAttributes || '',
        size: product.size || '',
        colour: product.colour || '',
        thickness: product.thickness || '',
        weightText: product.weightText || '',
        groupCode: product.groupCode || '',
      })
    } else {
      setEditingProduct(null)
      setFormData({ ...EMPTY_FORM, categoryId: activeCategoryFilter || '' })
    }
    setShowModal(true)
  }

  const [saving, runSave] = useBusy()
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      setDeletingId(id)
      try {
        await deleteProduct(id)
        await loadData()
        reloadStorefrontCategories()
      } catch (err) {
        alert("Failed to delete product: " + err.message)
      } finally {
        setDeletingId(null)
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    runSave(saveProduct)
  }

  const saveProduct = async () => {
    try {
      let payload = { ...formData }
      if (!payload.categoryId) delete payload.categoryId

      // An uploaded file always wins over the image URL. If the admin typed a
      // new URL for a product that has an uploaded file, clear the file so the
      // new URL is the one shown.
      const original = editingProduct ? products.find(p => p.id === editingProduct) : null
      if (!imageFile && original?.image_file && payload.image && payload.image !== (original.image || '')) {
        payload.image_file = null
      }

      if (imageFile) {
        const fd = new FormData()
        Object.keys(payload).forEach(k => {
          if (payload[k] !== null && payload[k] !== undefined && payload[k] !== '') {
            fd.append(k, payload[k])
          }
        })
        fd.append('image_file', imageFile)
        payload = fd
      }

      if (editingProduct) {
        await updateProduct(editingProduct, payload)
      } else {
        await createProduct(payload)
      }
      setShowModal(false)
      loadData()
      reloadStorefrontCategories()
    } catch (err) {
      alert("Error saving product: " + err.message)
    }
  }

  const currentEditProduct = editingProduct ? products.find(p => p.id === editingProduct) : null


  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            Product Management
            <span className="bg-gray-100 text-gray-600 text-xs py-1 px-2 rounded-full font-bold">
              {pageInfo.count} Items
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search name, SKU, brand…"
            aria-label="Search products"
            className="text-sm bg-white border border-gray-200 rounded-sm px-3 py-2 shadow-sm w-56 outline-none focus:border-[#00857C]"
          />
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-sm px-3 py-2 shadow-sm">
            <Filter size={16} className="text-gray-400" />
            <select
              className="text-sm border-none outline-none text-gray-700 bg-transparent"
              value={activeCategoryFilter}
              onChange={(e) => { setActiveCategoryFilter(e.target.value); setPage(1) }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{categoryLabel(c, categories)}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="bg-[#00857C] hover:bg-[#006B63] text-white px-4 py-2 rounded-sm flex items-center gap-2 font-bold transition-colors shadow-sm"
          >
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-sm text-sm mb-4">
          Could not load products: {loadError}
          <button onClick={loadData} className="underline font-bold ml-2">Try again</button>
        </div>
      )}

      {/* Product Table */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-bold">Image</th>
              <th className="p-4 font-bold">Name</th>
              <th className="p-4 font-bold">Category</th>
              <th className="p-4 font-bold">SKU</th>
              <th className="p-4 font-bold">Price (Ex. VAT)</th>
              <th className="p-4 font-bold">Section</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`${loading ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
            {products.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4">
                  {p.imageUrl || p.image_file || p.image ? (
                    <img src={p.imageUrl || p.image_file || p.image} alt={p.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No img</div>
                  )}
                </td>
                <td className="p-4 text-sm font-bold text-[#0066CC] max-w-xs truncate" title={p.name}>{p.name}{p.size && <span className="block text-xs font-normal text-gray-500">{p.size}</span>}</td>
                <td className="p-4 text-sm text-gray-600">
                  {p.category ? (
                    <span className="bg-gray-100 px-2 py-1 rounded-sm text-xs font-semibold">{p.category.name}</span>
                  ) : '-'}
                </td>
                <td className="p-4 text-sm text-gray-600 font-mono">{p.sku}</td>
                <td className="p-4 text-sm text-gray-900 font-bold">
                  {formatPrice(p.priceExVat) || '—'}
                </td>
                <td className="p-4 text-sm text-gray-500 capitalize">{p.section}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleOpenModal(p)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-sm mx-1">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId !== null} aria-label="Delete product" className="text-red-600 hover:bg-red-50 p-2 rounded-sm mx-1">
                    {deletingId === p.id ? <Spinner /> : <Trash2 size={16} />}
                  </button>
                </td>
              </tr>
            ))}
            {loading && products.length === 0 && [0, 1, 2, 3, 4].map(i => (
              <tr key={`s${i}`}><td colSpan="7" className="px-4 py-3"><Skeleton className="h-12" /></td></tr>
            ))}
            {!loading && products.length === 0 && (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={pageInfo.totalPages} onChange={setPage} />

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-5">

                {/* ── Basic Info ── */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Product Name *</label>
                  <input required type="text" value={formData.name} onChange={set('name')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">SKU *</label>
                    <input required type="text" value={formData.sku} onChange={set('sku')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Brand Name</label>
                    <input type="text" value={formData.brandName} onChange={set('brandName')} placeholder="e.g. Avery, Bic, 3M" className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none" />
                  </div>
                </div>

                {/* ── Details ── */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={formData.description} onChange={set('description')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Key attributes (one per line)</label>
                  <textarea rows={3} value={formData.keyAttributes} onChange={set('keyAttributes')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {DETAIL_FIELDS.map(([field, label, placeholder]) => (
                    <div key={field}>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
                      <input type="text" value={formData[field]} onChange={set(field)} placeholder={placeholder} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none" />
                    </div>
                  ))}
                </div>

                {/* ── Category & Section ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                    <select value={formData.categoryId} onChange={set('categoryId')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none">
                      <option value="">No Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{categoryLabel(c, categories)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Display Section</label>
                    <select value={formData.section} onChange={set('section')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none">
                      {SECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Pricing ── */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b pb-1">Pricing</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Price (Ex VAT) £ *</label>
                      <input required type="number" step="0.0001" min="0" value={formData.priceExVat} onChange={setPriceExVat} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Price (Inc VAT) £ *</label>
                      <input required type="number" step="0.0001" min="0" value={formData.priceIncVat} onChange={set('priceIncVat')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none" />
                      <p className="text-[11px] text-gray-500 mt-1">Filled in using {vatRate}% VAT.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Unit Info</label>
                      <input type="text" value={formData.unitInfo} onChange={set('unitInfo')} placeholder="e.g. per pack (50 sheets)" className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Weight (kg)</label>
                      <input type="number" step="0.001" min="0" value={formData.weight} onChange={set('weight')} placeholder="e.g. 0.250" className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none" />
                    </div>
                  </div>
                </div>

                {/* ── Tekstag's Selection (Sidebar Filters) ── */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b pb-1">Tekstag's Selection Badges</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Offer Badge</label>
                      <select value={formData.badge} onChange={set('badge')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none">
                        {withCurrent(BADGE_OPTIONS, formData.badge).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Shows "Buy More, Save More" on card</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Eco Badge</label>
                      <select value={formData.ecoBadge} onChange={set('ecoBadge')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none">
                        {withCurrent(ECO_OPTIONS, formData.ecoBadge).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Shows a green label on the product image</p>
                    </div>
                  </div>
                </div>

                {/* ── Availability (Sidebar Filter) ── */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b pb-1">Availability</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Stock Status</label>
                      <select value={formData.stockStatus} onChange={set('stockStatus')} className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none">
                        {withCurrent(STOCK_OPTIONS, formData.stockStatus).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Delivery Text</label>
                      <input type="text" value={formData.deliveryText} onChange={set('deliveryText')} placeholder="e.g. Order by 5pm, next day delivery" className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none" />
                    </div>
                  </div>
                </div>

                {/* ── Image ── */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b pb-1">Product Image</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Image URL</label>
                      <input
                        type="text"
                        placeholder="https://… or /images/products/…"
                        value={formData.image}
                        onChange={e => { setFormData(prev => ({ ...prev, image: e.target.value })); if (e.target.value) setImageFile(null) }}
                        className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Upload Image File</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFile(e.target.files[0])
                            setFormData(prev => ({ ...prev, image: '' }))
                          }
                        }}
                        className="w-full border border-gray-300 p-[9px] rounded-sm bg-white cursor-pointer"
                      />
                    </div>
                  </div>

                  {(imageFile || formData.image || currentEditProduct?.imageUrl || currentEditProduct?.image_file) && (
                    <div className="mt-3 p-2 border border-gray-200 rounded-sm bg-white inline-block">
                      {imageFile ? (
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-20 object-contain" />
                      ) : formData.image ? (
                        <img src={formData.image} alt="Preview" className="h-20 object-contain" />
                      ) : (
                        <img src={currentEditProduct?.imageUrl || currentEditProduct?.image_file} alt="Current" className="h-20 object-contain" />
                      )}
                    </div>
                  )}
                </div>

                {editingProduct ? (
                  <GalleryManager
                    productId={editingProduct}
                    shared={!!formData.groupCode}
                    onMainChanged={loadData}
                  />
                ) : (
                  <p className="text-xs text-gray-500">Save the product first to add gallery photos.</p>
                )}

              </div>

              <div className="mt-8 flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="bg-[#00857C] hover:bg-[#006B63] disabled:opacity-70 text-white px-6 py-2.5 rounded-sm font-bold shadow-sm flex items-center gap-2">{saving && <Spinner />}{saving ? 'Saving…' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
