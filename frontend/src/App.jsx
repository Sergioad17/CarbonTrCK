import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/Landing/LandingPage'
import { hydrateCurrentUser, login as loginRequest, logout as logoutRequest } from './api/auth'
import { fetchCurrentUser, removeSession } from './api/session'

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => fetchCurrentUser())
  const [ready, setReady] = useState(false)
  const loginCommitTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const nextUser = await hydrateCurrentUser().catch(() => null)
      if (cancelled) return
      setUser(nextUser || fetchCurrentUser())
      setReady(true)
    }

    hydrate()
    return () => {
      cancelled = true
      if (loginCommitTimerRef.current) {
        window.clearTimeout(loginCommitTimerRef.current)
        loginCommitTimerRef.current = null
      }
    }
  }, [])

  const login = async (credentials, options = {}) => {
    const nextUser = await loginRequest(credentials)
    const commitDelayMs = Math.max(0, Number(options?.commitDelayMs || 0) || 0)

    if (loginCommitTimerRef.current) {
      window.clearTimeout(loginCommitTimerRef.current)
      loginCommitTimerRef.current = null
    }

    if (commitDelayMs > 0) {
      loginCommitTimerRef.current = window.setTimeout(() => {
        setUser(nextUser)
        loginCommitTimerRef.current = null
      }, commitDelayMs)
    } else {
      setUser(nextUser)
    }

    return nextUser
  }

  const logout = async () => {
    if (loginCommitTimerRef.current) {
      window.clearTimeout(loginCommitTimerRef.current)
      loginCommitTimerRef.current = null
    }
    await logoutRequest()
    removeSession()
    setUser(null)
  }

  const updateUser = (nextUser) => {
    if (loginCommitTimerRef.current) {
      window.clearTimeout(loginCommitTimerRef.current)
      loginCommitTimerRef.current = null
    }
    setUser(nextUser)
  }

  return children({ user, login, logout, updateUser, ready })
}

export default function App() {
  return (
    <AuthProvider>
      {({ user, login, logout, updateUser, ready }) => (
        <BrowserRouter>
          {!ready ? null : (
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
          )}
        </BrowserRouter>
      )}
    </AuthProvider>
  )
}
