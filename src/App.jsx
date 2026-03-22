import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/Landing/LandingPage'
import { clearSession, createSessionForUser, getCurrentUser } from './lib/sessionStore'

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser())

  const login = (userData) => {
    const nextUser = createSessionForUser(userData)
    setUser(nextUser)
  }

  const logout = () => {
    clearSession()
    setUser(null)
  }

  const updateUser = (nextUser) => {
    setUser(nextUser)
  }

  return children({ user, login, logout, updateUser })
}

export default function App() {
  return (
    <AuthProvider>
      {({ user, login, logout, updateUser }) => (
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                user
                  ? <DashboardPage user={user} onLogout={logout} onUserChange={updateUser} />
                  : <LandingPage />
              }
            />

            <Route
              path="/login"
              element={
                user
                  ? <Navigate to="/" replace />
                  : <LoginPage onLogin={login} />
              }
            />

            <Route
              path="/perfil"
              element={
                user
                  ? <DashboardPage user={user} onLogout={logout} onUserChange={updateUser} />
                  : <Navigate to="/login" replace />
              }
            />

            <Route
              path="/*"
              element={
                user
                  ? <DashboardPage user={user} onLogout={logout} onUserChange={updateUser} />
                  : <Navigate to="/login" replace />
              }
            />
          </Routes>
        </BrowserRouter>
      )}
    </AuthProvider>
  )
}
