import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import ToastContainer from '../components/common/ToastContainer.jsx'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'info', timeout = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setToasts((current) => [...current, { id, message, type }])
      if (timeout) setTimeout(() => dismiss(id), timeout)
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      toast: {
        info: (message) => push(message, 'info'),
        success: (message) => push(message, 'success'),
        error: (message) => push(message, 'error', 6000),
        warning: (message) => push(message, 'warning'),
      },
    }),
    [toasts, dismiss, push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context.toast
}

export default ToastContext
