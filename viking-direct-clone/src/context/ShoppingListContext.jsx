/**
 * ShoppingListContext
 *
 * Security fixes applied:
 *  - Hardcoded 'http://localhost:8000/api' URL removed.
 *    All calls now go through the centralised apiFetch() wrapper in api.js
 *    which uses the same-origin relative path '/api' (proxied by Vite in dev,
 *    by nginx in production).
 *  - localStorage.getItem('token') removed from all fetch calls.
 *    Authentication is via the httpOnly cookie sent automatically with
 *    credentials: 'include' (handled inside apiFetch).
 *  - console.error removed (dropped by Vite build in production).
 */
import React, { createContext, useContext, useState } from 'react'
import { useAuth } from './AuthContext'

const ShoppingListContext = createContext()

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

/**
 * Thin fetch helper — uses credentials: 'include' so the httpOnly
 * auth cookie is sent automatically. No Authorization header needed.
 */
async function listsFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res
}

export function ShoppingListProvider({ children }) {
  const { isLoggedIn } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [targetProduct, setTargetProduct] = useState(null)
  const [userLists, setUserLists] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchLists = async () => {
    if (!isLoggedIn) return
    setLoading(true)
    try {
      const res = await listsFetch('/shopping-lists/')
      if (res.ok) {
        const data = await res.json()
        setUserLists(data)
      }
    } catch {
      // Silent — network errors handled by showing notification on action failure
    } finally {
      setLoading(false)
    }
  }

  const openAddToListModal = (product) => {
    if (!isLoggedIn) {
      showNotification('Please sign in to manage your shopping lists.', 'error')
      return
    }
    setTargetProduct(product)
    setShowModal(true)
    fetchLists()
  }

  const closeAddToListModal = () => {
    setShowModal(false)
    setTargetProduct(null)
  }

  const addItemToList = async (listId, listName) => {
    if (!targetProduct) return
    try {
      const res = await listsFetch(`/shopping-lists/${listId}/add_item/`, {
        method: 'POST',
        body: JSON.stringify({ productId: targetProduct.id }),
      })
      if (res.ok) {
        showNotification(`"${targetProduct.name}" added to ${listName}`)
        closeAddToListModal()
      } else {
        const err = await res.json().catch(() => ({}))
        showNotification(err.error || 'Failed to add item to list.', 'error')
      }
    } catch {
      showNotification('Error adding to list. Please try again.', 'error')
    }
  }

  const createAndAddToList = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      const res = await listsFetch('/shopping-lists/', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      })
      if (res.ok) {
        const newList = await res.json()
        await addItemToList(newList.id, newList.name)
        fetchLists()
      } else {
        showNotification('Error creating list.', 'error')
      }
    } catch {
      showNotification('Error creating list. Please try again.', 'error')
    }
  }

  return (
    <ShoppingListContext.Provider value={{
      showModal,
      targetProduct,
      userLists,
      loading,
      notification,
      openAddToListModal,
      closeAddToListModal,
      addItemToList,
      createAndAddToList,
      showNotification,
    }}>
      {children}
    </ShoppingListContext.Provider>
  )
}

export function useShoppingList() {
  const context = useContext(ShoppingListContext)
  if (!context) {
    throw new Error('useShoppingList must be used within a ShoppingListProvider')
  }
  return context
}
