import { useState, useEffect } from 'react'
import { fetchUsers } from '../../api'
import { Users, Mail, Calendar, ShieldCheck, Search } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await fetchUsers()
      setUsers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    (user.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <div className="p-8 text-gray-500 font-medium animate-pulse">Loading users...</div>

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-[#00857C]" /> User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">View and manage registered customers and staff</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-sm focus:border-[#00857C] outline-none text-sm"
          />
        </div>
        <div className="text-sm font-bold text-gray-700 bg-gray-50 px-4 py-2 rounded-sm border border-gray-200">
          Total Users: <span className="text-[#00857C] text-lg">{users.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden pb-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[13px] text-gray-600">
              <th className="py-3 px-4 font-bold uppercase tracking-wider">ID</th>
              <th className="py-3 px-4 font-bold uppercase tracking-wider">Username</th>
              <th className="py-3 px-4 font-bold uppercase tracking-wider">Email</th>
              <th className="py-3 px-4 font-bold uppercase tracking-wider">Role</th>
              <th className="py-3 px-4 font-bold uppercase tracking-wider hidden md:table-cell">Date Joined</th>
              <th className="py-3 px-4 font-bold uppercase tracking-wider hidden lg:table-cell">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500 font-medium">No users found matching your search.</td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                  <td className="py-3 px-4 text-sm text-gray-500 font-mono">#{user.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-800">{user.username}</div>
                    {(user.first_name || user.last_name) && (
                      <div className="text-xs text-gray-500 mt-0.5">{user.first_name} {user.last_name}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={14} className="text-gray-400" />
                      {user.email || <span className="text-gray-400 italic">No email</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {user.is_staff ? (
                      <span className="flex items-center gap-1 bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-1 rounded-full w-max">
                        <ShieldCheck size={12} /> Admin
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 font-semibold text-xs px-2.5 py-1 rounded-full w-max">
                        Customer
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      {user.date_joined ? user.date_joined.split(' ')[0] : 'N/A'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 hidden lg:table-cell">
                    {user.last_login ? user.last_login : 'Never logged in'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
