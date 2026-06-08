import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/AuthContext'
import { useState, useEffect, createContext, useContext } from 'react'
import LoginPage from './pages/LoginPage'
import OfflineBanner from './components/OfflineBanner'
import SalesDashboard from './pages/SalesDashboard'
import ManagementDashboard from './pages/ManagementDashboard'

export const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={dark ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
      className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden transition-all hover:scale-110"
      style={{ padding: 0 }}
    >
      <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* ciemna */}
        <path d="M0,0 L20,0 L20,40 L0,40 Z" fill="#1e293b" />
        {/* jasna */}
        <path d="M20,0 L40,0 L40,40 L20,40 Z" fill="#f1f5f9" />
        <line x1="20" y1="0" x2="20" y2="40" stroke="#64748b" strokeWidth="0.5" />
      </svg>
    </button>
  )
}

function RequireAuth({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'management' ? '/management' : '/dashboard'} replace />
  }
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'management' ? '/management' : '/dashboard'} replace />
}

export default function App() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  const toggle = () => setDark(d => !d)

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <AuthProvider>
        <BrowserRouter>
          <OfflineBanner />
          <ThemeToggle />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth role="sales">
                  <SalesDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/management"
              element={
                <RequireAuth role="management">
                  <ManagementDashboard />
                </RequireAuth>
              }
            />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeContext.Provider>
  )
}