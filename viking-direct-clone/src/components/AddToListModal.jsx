import React, { useState } from 'react'
import { X, Plus, Check, AlertCircle, List as ListIcon } from 'lucide-react'
import { useShoppingList } from '../context/ShoppingListContext'

export default function AddToListModal() {
  const { 
    showModal, 
    targetProduct, 
    userLists, 
    loading, 
    closeAddToListModal, 
    addItemToList, 
    createAndAddToList,
    notification 
  } = useShoppingList()

  const [newListName, setNewListName] = useState('')

  if (!showModal) return null

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    if (newListName.trim()) {
      createAndAddToList(newListName)
      setNewListName('')
    }
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] transition-opacity duration-300"
        onClick={closeAddToListModal}
      />

      {/* Modal Card */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white w-full max-w-[420px] rounded-sm shadow-2xl pointer-events-auto animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-[18px] font-bold text-gray-900">Add to shopping list</h2>
            <button 
              onClick={closeAddToListModal}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
            {/* Product being added */}
            {targetProduct && (
              <div className="flex gap-4 items-center mb-6 bg-gray-50 p-3 rounded-sm border border-gray-100">
                <div className="w-14 h-14 bg-white border border-gray-200 rounded-sm flex items-center justify-center p-1 shrink-0">
                  <img 
                    src={targetProduct.imageUrl || targetProduct.image} 
                    alt="" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-gray-800 line-clamp-1">{targetProduct.name}</p>
                  {targetProduct.sku && <p className="text-[11px] text-gray-500 mt-0.5">SKU {targetProduct.sku}</p>}
                </div>
              </div>
            )}

            {/* List Selection */}
            <div className="mb-6">
              <h3 className="text-[13px] font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ListIcon size={14} className="text-[#00857C]" />
                Your Lists
              </h3>
              
              {loading ? (
                <div className="space-y-2">
                   {[1,2].map(i => <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-sm" />)}
                </div>
              ) : userLists.length > 0 ? (
                <div className="space-y-2">
                  {userLists.map(list => (
                    <button
                      key={list.id}
                      onClick={() => addItemToList(list.id, list.name)}
                      className="w-full text-left px-4 py-3 border border-gray-200 rounded-sm hover:border-[#00857C] hover:bg-[#00857C]/5 transition-all flex justify-between items-center group"
                    >
                      <span className="font-semibold text-gray-800 text-[14px]">{list.name}</span>
                      <Plus size={16} className="text-gray-400 group-hover:text-[#00857C] transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-sm border border-dashed border-gray-200">
                  <p className="text-[13px] text-gray-500">No lists found. Create one below!</p>
                </div>
              )}
            </div>

            {/* Create New List */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-[13px] font-bold text-gray-700 uppercase tracking-wide mb-3">Create New List</h3>
              <form onSubmit={handleCreateSubmit} className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="e.g. Office Supplies..."
                  className="flex-1 border border-gray-300 rounded-sm px-3 py-2 text-[14px] outline-none focus:border-[#00857C] focus:ring-1 focus:ring-[#00857C]/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newListName.trim() || loading}
                  className="bg-[#00857C] hover:bg-[#006B63] text-white px-4 py-2 font-bold text-[13px] rounded-sm disabled:opacity-50 transition-colors shadow-sm active:scale-95"
                >
                  Create & Add
                </button>
              </form>
            </div>
          </div>

          {/* Footer / Meta */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center flex-shrink-0">
             <p className="text-[11px] text-gray-400 text-center">
               Lists help you organize your future orders and save time at checkout.
             </p>
          </div>
        </div>
      </div>

      {/* Internal Notification (optional, if context one isn't enough) */}
      {notification && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 ${
          notification.type === 'error' ? 'bg-[#D52B1E] text-white' : 'bg-[#00857C] text-white'
        }`}>
          {notification.type === 'success' ? <Check size={18} strokeWidth={3} /> : <AlertCircle size={18} />}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}
    </>
  )
}
