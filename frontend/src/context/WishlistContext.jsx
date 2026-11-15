import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  addWishlistItem,
  fetchWishlist,
  moveWishlistItemToCart,
  removeWishlistItem,
} from '../services/cartService.js'
import { useAuth } from './AuthContext.jsx'
import { useCart } from './CartContext.jsx'
import { useToast } from './ToastContext.jsx'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { isAuthenticated, initializing } = useAuth()
  const { setCart } = useCart()
  const toast = useToast()
  const [wishlist, setWishlist] = useState({ items: [] })
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist({ items: [] })
      return
    }
    setLoading(true)
    try {
      const result = await fetchWishlist()
      setWishlist(result.wishlist || { items: [] })
    } catch (error) {
      // Non blocking.
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!initializing) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, initializing])

  const toggle = useCallback(
    async (productId) => {
      const exists = wishlist.items.some((item) => (item.product?._id || item.product) === productId)
      setLoading(true)
      try {
        const result = exists
          ? await removeWishlistItem(productId)
          : await addWishlistItem(productId)
        setWishlist(result.wishlist || { items: [] })
        toast.success(exists ? 'Removed from wishlist' : 'Saved to wishlist')
        return !exists
      } catch (error) {
        toast.error(error.message)
        return exists
      } finally {
        setLoading(false)
      }
    },
    [wishlist, toast],
  )

  const moveToCart = useCallback(
    async (productId, quantity = 1) => {
      setLoading(true)
      try {
        const result = await moveWishlistItemToCart(productId, quantity)
        setWishlist(result.wishlist || { items: [] })
        if (result.cart) setCart(result.cart)
        toast.success('Moved to your cart')
        return true
      } catch (error) {
        toast.error(error.message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [setCart, toast],
  )

  const value = useMemo(
    () => ({
      wishlist,
      loading,
      count: wishlist.items?.length || 0,
      reload: load,
      toggle,
      moveToCart,
      isWishlisted: (productId) =>
        (wishlist.items || []).some((item) => (item.product?._id || item.product) === productId),
    }),
    [wishlist, loading, load, toggle, moveToCart],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used inside WishlistProvider')
  return context
}

export default WishlistContext
