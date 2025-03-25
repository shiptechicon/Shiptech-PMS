import { NavLink } from 'react-router-dom'
import { DollarSign } from 'lucide-react'

export default function Settings() {
  return (
    <div className='min-h-screen p-4 bg-gray-100'>
      <h1 className='text-2xl font-bold mb-4'>Settings</h1>
      <div className='bg-white p-6 rounded-lg shadow-md'>
        <h2 className='text-xl font-semibold mb-2'>Manage Links</h2>
        <NavLink
          to="/dashboard/currencies/"
          className={({ isActive }) =>
            `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 py-3 ${isActive
              ? "bg-black/90 text-white"
              : "text-gray-700 hover:bg-gray-50"
            }`
          }
        >
          <DollarSign size={20} />
          <span>Currencies</span>
        </NavLink>
        {/* Add more links as needed */}
      </div>
    </div>
  )
}
