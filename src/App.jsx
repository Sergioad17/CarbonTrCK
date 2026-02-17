import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

/* Simple auth context (demo only) */
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = (userData) => {
    setUser(userData)
  }

  const logout = () => {
    setUser(null)
  }

  return children({ user, login, logout })
}

export default function App() {
  return (
    <AuthProvider>
      {({ user, login, logout }) => (
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                user
                  ? <Navigate to="/" replace />
                  : <LoginPage onLogin={login} />
              }
            />
            <Route
              path="/*"
              element={
                user
                  ? <DashboardPage user={user} onLogout={logout} />
                  : <Navigate to="/login" replace />
              }
            />
          </Routes>
        </BrowserRouter>
      )}
    </AuthProvider>
  )
}
