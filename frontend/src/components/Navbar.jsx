import { useAuth } from '../store/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-7 h-7 object-contain" />
          <span className="font-semibold text-slate-800 text-lg tracking-tight">Forecast Management</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-700">{user?.full_name}</p>
            <p className="text-xs text-slate-400 font-mono">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost text-sm">
            Wyloguj
          </button>
        </div>
      </div>
    </header>
  )
}