import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  addCartItem,
  applyCartCoupon,
  clearCart as clearCartRequest,
  fetchCart,
  moveSavedItemToCart,
  removeCartItem,
  removeSavedItem,
  saveCartItemForLater,
  updateCartItem,
} from '../services/cartService.js'
import { useAuth } from './AuthContext.jsx'
import { useToast } from './ToastContext.jsx'

const EMPTY_CART = {
  items: [],
  savedItems: [],
  itemCount: 0,
  totals: {
    subtotal: 0,
    discount: 0,
    couponCode: '',
    couponDiscount: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    currency: 'usd',
    coupon: null,
  },
  issues: [],
  availableCoupons: [],
}

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { isAuthenticated, initializing } = useAuth()
  const toast = useToast()
  const [cart, setCart] = useState(EMPTY_CART)
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (coupon = '') => {
      if (!isAuthenticated) {
        setCart(EMPTY_CART)
        return
      }
      setLoading(true)
      try {
        const result = await fetchCart(coupon)
        setCart(result.cart || EMPTY_CART)
        ;(result.cart?.issues || []).forEach((issue) => toast.warning(issue.message))
      } catch (error) {
        // A failed cart load should never break the whole page.
      } finally {
        setLoading(false)
      }
    },
    [isAuthenticated, toast],
  )

  useEffect(() => {
    if (!initializing) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, initializing])

  const wrap = useCallback(
    async (request, successMessage) => {
      setLoading(true)
      try {
        const result = await request()
        setCart(result.cart || EMPTY_CART)
        if (successMessage) toast.success(successMessage)
        return true
      } catch (error) {
        toast.error(error.message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  const value = useMemo(
    () => ({
      cart,
      loading,
      itemCount: cart.itemCount || 0,
      savedCount: cart.savedItems?.length || 0,
      reload: load,
      setCart,
      addToCart: (productId, quantity = 1) =>
        wrap(() => addCartItem(productId, quantity), 'Added to your cart'),
      updateQuantity: (productId, quantity) => wrap(() => updateCartItem(productId, quantity)),
      removeFromCart: (productId) => wrap(() => removeCartItem(productId), 'Removed from cart'),
      clearCart: () => wrap(() => clearCartRequest(), 'Cart cleared'),
      saveForLater: (productId) => wrap(() => saveCartItemForLater(productId), 'Saved for later'),
      moveSavedToCart: (productId) => wrap(() => moveSavedItemToCart(productId), 'Moved back to cart'),
      removeSaved: (productId) => wrap(() => removeSavedItem(productId), 'Removed from saved items'),
      applyCoupon: (code) => wrap(() => applyCartCoupon(code), 'Coupon applied'),
      isInCart: (productId) => cart.items.some((item) => item.product._id === productId),
    }),
    [cart, loading, load, wrap],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside CartProvider')
  return context
}

export default CartContext
