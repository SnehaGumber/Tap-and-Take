import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { TOKEN_KEY, USER_KEY, setUnauthorizedHandler } from '../services/api.js'
import { fetchMe, loginUser, logoutUser, registerUser } from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem(USER_KEY)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      return null
    }
  })
  const [initializing, setInitializing] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

  const persist = useCallback((nextUser, token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  // Persistent login: revalidate the stored JWT against the API on boot.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    if (!localStorage.getItem(TOKEN_KEY)) {
      setInitializing(false)
      return
    }
    fetchMe()
      .then((result) => {
        if (result.user) persist(result.user)
      })
      .catch(() => clear())
      .finally(() => setInitializing(false))
  }, [persist, clear])

  const login = useCallback(
    async (credentials) => {
      const result = await loginUser(credentials)
      persist(result.user, result.token)
      return result.user
    },
    [persist],
  )

  const register = useCallback(
    async (payload) => {
      const result = await registerUser(payload)
      persist(result.user, result.token)
      return result.user
    },
    [persist],
  )

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) await logoutUser()
    } catch (error) {
      // Logging out locally must always succeed.
    }
    clear()
  }, [clear])

  const refresh = useCallback(async () => {
    const result = await fetchMe()
    if (result.user) persist(result.user)
    return result.user
  }, [persist])

  const value = useMemo(
    () => ({
      user,
      setUser: (nextUser) => persist(nextUser),
      isAuthenticated: Boolean(user),
      role: user?.role || null,
      initializing,
      login,
      register,
      logout,
      refresh,
      api,
    }),
    [user, initializing, login, register, logout, refresh, persist],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export default AuthContext
