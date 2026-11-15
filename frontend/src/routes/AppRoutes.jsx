import { Route, Routes } from 'react-router-dom'
import CustomerLayout from '../layouts/CustomerLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import RoleProtectedRoute from './RoleProtectedRoute.jsx'

import Home from '../pages/customer/Home.jsx'
import Products from '../pages/customer/Products.jsx'
import ProductDetails from '../pages/customer/ProductDetails.jsx'
import SearchResults from '../pages/customer/SearchResults.jsx'
import Login from '../pages/auth/Login.jsx'
import Register from '../pages/auth/Register.jsx'
import SellerLogin from '../pages/auth/SellerLogin.jsx'
import AdminLogin from '../pages/auth/AdminLogin.jsx'
import Profile from '../pages/customer/Profile.jsx'
import Addresses from '../pages/customer/Addresses.jsx'
import Cart from '../pages/customer/Cart.jsx'
import Wishlist from '../pages/customer/Wishlist.jsx'
import Checkout from '../pages/customer/Checkout.jsx'
import PaymentResult from '../pages/customer/PaymentResult.jsx'
import Orders from '../pages/customer/Orders.jsx'
import OrderDetails from '../pages/customer/OrderDetails.jsx'
import NotFound from '../pages/NotFound.jsx'

import SellerDashboard from '../pages/seller/SellerDashboard.jsx'
import SellerProducts from '../pages/seller/SellerProducts.jsx'
import AddProduct from '../pages/seller/AddProduct.jsx'
import EditProduct from '../pages/seller/EditProduct.jsx'
import SellerOrders from '../pages/seller/SellerOrders.jsx'
import SellerOrderDetails from '../pages/seller/SellerOrderDetails.jsx'
import SellerProfile from '../pages/seller/SellerProfile.jsx'

import AdminDashboard from '../pages/admin/AdminDashboard.jsx'
import AdminUsers from '../pages/admin/AdminUsers.jsx'
import AdminSellers from '../pages/admin/AdminSellers.jsx'
import AdminProducts from '../pages/admin/AdminProducts.jsx'
import AdminCategories from '../pages/admin/AdminCategories.jsx'
import AdminOrders from '../pages/admin/AdminOrders.jsx'

const SELLER_LINKS = [
  { to: '/seller/dashboard', label: 'Dashboard', icon: '\u25A6' },
  { to: '/seller/products', label: 'Products', icon: '\u{1F4E6}' },
  { to: '/seller/products/new', label: 'Add product', icon: '\u002B' },
  { to: '/seller/orders', label: 'Orders', icon: '\u{1F9FE}' },
  { to: '/seller/profile', label: 'Store profile', icon: '\u{1F3EA}' },
]

const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '\u25A6' },
  { to: '/admin/users', label: 'Users', icon: '\u{1F465}' },
  { to: '/admin/sellers', label: 'Sellers', icon: '\u{1F3EA}' },
  { to: '/admin/products', label: 'Products', icon: '\u{1F4E6}' },
  { to: '/admin/categories', label: 'Categories', icon: '\u{1F5C2}' },
  { to: '/admin/orders', label: 'Orders', icon: '\u{1F9FE}' },
]

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Route>

      <Route element={<CustomerLayout />}>
        <Route index element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:idOrSlug" element={<ProductDetails />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/cart" element={<Cart />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/addresses" element={<Addresses />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-result" element={<PaymentResult />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        element={
          <RoleProtectedRoute roles={['seller']} redirectTo="/seller/login">
            <DashboardLayout variant="seller" links={SELLER_LINKS} />
          </RoleProtectedRoute>
        }
      >
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        <Route path="/seller/products" element={<SellerProducts />} />
        <Route path="/seller/products/new" element={<AddProduct />} />
        <Route path="/seller/products/:id/edit" element={<EditProduct />} />
        <Route path="/seller/orders" element={<SellerOrders />} />
        <Route path="/seller/orders/:id" element={<SellerOrderDetails />} />
        <Route path="/seller/profile" element={<SellerProfile />} />
      </Route>

      <Route
        element={
          <RoleProtectedRoute roles={['admin']} redirectTo="/admin/login">
            <DashboardLayout variant="admin" links={ADMIN_LINKS} />
          </RoleProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/sellers" element={<AdminSellers />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
      </Route>
    </Routes>
  )
}
