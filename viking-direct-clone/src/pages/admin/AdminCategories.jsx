import { useState, useEffect } from 'react'
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../api'
import { useCategories } from '../../context/CategoriesContext'
import { Edit2, Trash2, Plus, X } from 'lucide-react'
import { categoryLabel } from '../../utils/product'
import ImageInput from './ImageInput'
import ColorInput from './ColorInput'
import { Spinner, SkeletonRows } from '../../components/Loaders'
import { useBusy } from '../../hooks/useBusy'

const EMPTY_FORM = { name: '', parent: '', slug: '', fromPrice: '', image: '', fallbackColor: '' }

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  // The storefront's shared category list; refreshed after every change here.
  const { reload: reloadStorefrontCategories } = useCategories()

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  // Form state
  const [formData, setFormData] = useState(EMPTY_FORM)

  const loadCategories = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (err) {
      console.error(err)
      setLoadError(err.message || 'Could not load categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const afterChange = () => {
    loadCategories()
    reloadStorefrontCategories()
  }

  const [uploading, setUploading] = useState(false)

  const handleOpenModal = (cat = null) => {
    setUploading(false)
    if (cat) {
      setEditingCategory(cat.id)
      setFormData({
        name: cat.name || '',
        parent: cat.parent || '',
        slug: cat.slug || '',
        fromPrice: cat.fromPrice || '',
        image: cat.image || '',
        fallbackColor: cat.fallbackColor || ''
      })
    } else {
      setEditingCategory(null)
      setFormData(EMPTY_FORM)
    }
    setShowModal(true)
  }

  const handleDelete = async (cat) => {
    const count = cat.productCount || 0
    const warning = count > 0
      ? `Delete "${cat.name}"? Its ${count} product${count !== 1 ? 's' : ''} will be kept but will no longer belong to any category.`
      : `Delete "${cat.name}"?`
    if (window.confirm(warning)) {
      try {
        setDeletingId(cat.id)
        await deleteCategory(cat.id)
        afterChange()
      } catch (err) {
        alert("Failed to delete category: " + err.message)
      } finally {
        setDeletingId(null)
      }
    }
  }

  const [saving, runSave] = useBusy()
  const [deletingId, setDeletingId] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    runSave(saveCategory)
  }

  const saveCategory = async () => {
    try {
      // A blank slug is generated from the name by the server.
      const djangoPayload = {
        name: formData.name.trim(),
        parent: formData.parent || null,
        slug: formData.slug.trim(),
        fromPrice: formData.fromPrice.trim(),
        image: formData.image.trim(),
        fallbackColor: formData.fallbackColor.trim()
      }

      if (editingCategory) {
        await updateCategory(editingCategory, djangoPayload)
      } else {
        await createCategory(djangoPayload)
      }
      setShowModal(false)
      afterChange()
    } catch (err) {
      alert("Error saving category: " + err.message)
    }
  }

  // Only the first load shows placeholders; later refreshes keep the table.
  if (loading && categories.length === 0) return <SkeletonRows rows={6} />
  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-sm text-sm">
        Could not load categories: {loadError}{' '}
        <button onClick={loadCategories} className="underline font-bold ml-1">Try again</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Category Management</h1>
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-[#00857C] hover:bg-[#006B63] text-white px-4 py-2 rounded-sm flex items-center gap-2 font-bold transition-colors"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-bold">Image</th>
              <th className="p-4 font-bold">Category Name</th>
              <th className="p-4 font-bold">Slug / Permalink</th>
              <th className="p-4 font-bold">Products</th>
              <th className="p-4 font-bold">Colour</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: c.fallbackColor || '#ccc'}}>
                      {c.name.charAt(0)}
                    </div>
                  )}
                </td>
                <td className="p-4 text-sm font-bold text-gray-800">{categoryLabel(c, categories)}</td>
                <td className="p-4 text-sm text-gray-500">{c.slug ? `/category/${c.slug}` : '-'}</td>
                <td className="p-4 text-sm text-gray-500">{c.productCount ?? 0}</td>
                <td className="p-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border border-gray-300" style={{backgroundColor: c.fallbackColor || '#F3F4F6'}} />
                    {!c.fallbackColor && 'Default'}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleOpenModal(c)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-sm mx-1">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(c)} disabled={deletingId !== null} aria-label="Delete category" className="text-red-600 hover:bg-red-50 p-2 rounded-sm mx-1">
                    {deletingId === c.id ? <Spinner /> : <Trash2 size={16} />}
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">No categories found. Add one to get started!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Office Supplies" className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#00857C] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Parent Category</label>
                  <select value={formData.parent} onChange={e => setFormData({...formData, parent: e.target.value})} className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#00857C] outline-none bg-white">
                    <option value="">None (main category)</option>
                    {categories.filter(c => !c.parent && c.id !== editingCategory).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL)</label>
                  <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="e.g. office-supplies" className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#00857C] outline-none" />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave blank to generate it from the name. Must be unique. Changing it changes the category's web address.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">From Price (display text)</label>
                  <input type="text" value={formData.fromPrice} onChange={e => setFormData({...formData, fromPrice: e.target.value})} placeholder="e.g. From £2.99" className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#00857C] outline-none" />
                  <p className="text-xs text-gray-400 mt-1">
                    Shown under the homepage category circle. Leave blank to show the lowest real product price.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Circle colour <span className="font-normal text-gray-400">(used when there is no picture)</span></label>
                  <ColorInput value={formData.fallbackColor} onChange={fallbackColor => setFormData(prev => ({ ...prev, fallbackColor }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Picture</label>
                  <ImageInput
                    key={editingCategory ?? 'new'}
                    value={formData.image}
                    onChange={image => setFormData(prev => ({ ...prev, image }))}
                    onBusyChange={setUploading}
                  />
                </div>
              </div>
              
              <div className="mt-8 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={uploading || saving} className="bg-[#00857C] hover:bg-[#006B63] disabled:opacity-60 text-white px-4 py-2 rounded-sm font-bold flex items-center gap-2">{saving && <Spinner />}{uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
