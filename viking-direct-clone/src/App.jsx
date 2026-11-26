import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import TopProgressBar from './components/TopProgressBar'
import PageTransition from './components/PageTransition'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ShoppingListProvider } from './context/ShoppingListContext'
import { CategoriesProvider } from './context/CategoriesContext'
import TopBar from './components/TopBar'
import DocumentTitle from './components/DocumentTitle'
import Navbar from './components/Navbar'
import CategoryNav from './components/CategoryNav'
import Footer from './components/Footer'
import AddToBasketModal from './components/AddToBasketModal'
import ScrollToTop from './components/ScrollToTop'
import AddToListModal from './components/AddToListModal'

import HomePage from './pages/HomePage'
import ListingPage from './pages/ListingPage'
import ProductDetailPage from './pages/ProductDetailPage'
import BasketPage from './pages/BasketPage'
import CheckoutPage from './pages/CheckoutPage'
import AuthPage from './pages/AuthPage'
import MyAccountPage from './pages/MyAccountPage'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCategories from './pages/admin/AdminCategories'
import AdminStorefront from './pages/admin/AdminStorefront'
import AdminUsers from './pages/admin/AdminUsers'
import AdminOrders from './pages/admin/AdminOrders'
import AdminSettings from './pages/admin/AdminSettings'
import AdminVouchers from './pages/admin/AdminVouchers'

// Create a layout for public facing pages ensuring Navbar & Footer are rendered.
function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <Navbar />
      <CategoryNav />
      <main>
        <PageTransition />
      </main>
      <Footer />
      <AddToBasketModal />
      <AddToListModal />
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <TopProgressBar />
      <AuthProvider>
        <CartProvider>
          <SettingsProvider>
            <DocumentTitle />
            <CategoriesProvider>
            <ShoppingListProvider>
              <Routes>
              {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="storefront" element={<AdminStorefront />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="vouchers" element={<AdminVouchers />} />
            </Route>

            {/* Public End-User Routes */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Navigate to="/home" />} />
              <Route path="home" element={<HomePage />} />
              <Route path="category" element={<ListingPage />} />
              <Route path="category/:slug" element={<ListingPage />} />
              {/* The backend has no subcategories; old subcategory links open the parent category. */}
              <Route path="category/:slug/:subcat" element={<ListingPage />} />
              <Route path="search" element={<ListingPage mode="search" />} />
              <Route path="product/:id" element={<ProductDetailPage />} />
              <Route path="cart" element={<BasketPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="login" element={<AuthPage />} />
              <Route path="account" element={<MyAccountPage />} />
              <Route path="account/:tab" element={<MyAccountPage />} />
              </Route>
            </Routes>
            </ShoppingListProvider>
            </CategoriesProvider>
          </SettingsProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}

