import { useState, useEffect } from 'react'
import { Package, Users, Tag, List, ShoppingBag, Clock, Truck, CheckCircle, ArrowUpRight, ArrowRight, MoreHorizontal } from 'lucide-react'
import { fetchStats } from '../../api'
import { Skeleton, SkeletonRows } from '../../components/Loaders'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchStats()
        setStats(data)
      } catch (err) {
        console.error("Failed to load stats", err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) return (
    <div role="status" aria-label="Loading" className="space-y-8">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <SkeletonRows rows={3} />
    </div>
  )

  const statCards = [
    { title: "Total Orders",     value: stats?.total_orders     || 0, icon: ShoppingBag,  trend: 'All time',  trendUp: null },
    { title: "Total Products",   value: stats?.total_products   || 0, icon: Package,      trend: '+12%',      trendUp: true },
    { title: "Registered Users", value: stats?.total_users      || 0, icon: Users,        trend: '+4.3%',     trendUp: true },
    { title: "Active Brands",    value: stats?.total_brands     || 0, icon: Tag,          trend: '+2 new',    trendUp: true },
  ]

  const orderStatusCards = [
    { label: 'Pending',      value: stats?.orders_pending     || 0, icon: Clock,        color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Processing',   value: stats?.orders_processing  || 0, icon: Package,      color: 'text-blue-600 bg-blue-50' },
    { label: 'Shipped',      value: stats?.orders_shipped     || 0, icon: Truck,        color: 'text-purple-600 bg-purple-50' },
    { label: 'Delivered',    value: stats?.orders_delivered   || 0, icon: CheckCircle,  color: 'text-emerald-600 bg-emerald-50' },
  ]

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Metrics and high-level data from the Tekstag database.</p>
         </div>
         <div className="flex items-center gap-3">
            <Link to="/admin/products" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
               Manage Catalog
            </Link>
            <Link to="/admin/storefront" className="bg-[#111827] hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
               Edit Storefront
            </Link>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg">
                 <stat.icon size={20} className="text-gray-600" />
              </div>
              <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={18}/></button>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <div className="flex items-center justify-between">
                 <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                 {stat.trendUp === true && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{stat.trend}</span>}
                 {stat.trendUp === false && <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">{stat.trend}</span>}
                 {stat.trendUp === null && <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{stat.trend}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Status Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {orderStatusCards.map((card, i) => (
          <Link to="/admin/orders" key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4 hover:border-gray-300 transition-colors group">
            <div className={`p-2.5 rounded-lg ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

         {/* Activity / Info Split */}
         <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* Quick Actions Widget */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col max-w-xl">
             <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
             <div className="space-y-2 flex-1">
                <Link to="/admin/orders" className="block p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors group">
                   <p className="text-sm font-bold text-gray-900 group-hover:text-[#D52B1E]">Manage Orders</p>
                   <p className="text-xs text-gray-500 mt-1">Track, update and fulfil orders</p>
                </Link>
                <Link to="/admin/products" className="block p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors group">
                   <p className="text-sm font-bold text-gray-900 group-hover:text-[#D52B1E]">Add New Product</p>
                   <p className="text-xs text-gray-500 mt-1">Insert an item to the catalog</p>
                </Link>
                <Link to="/admin/storefront" className="block p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors group">
                   <p className="text-sm font-bold text-gray-900 group-hover:text-[#D52B1E]">Update Hero Banner</p>
                   <p className="text-xs text-gray-500 mt-1">Change the main promo code</p>
                </Link>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                   <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Status</span>
                   <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-xs font-medium text-gray-900">All systems nominal</span></div>
                </div>
             </div>
         </div>
      </div>
      
    </div>
  )
}
