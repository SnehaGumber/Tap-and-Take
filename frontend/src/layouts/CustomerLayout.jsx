import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import BackToTop from '../components/common/BackToTop.jsx'

export default function CustomerLayout() {
  const { pathname } = useLocation()

  // Every navigation should start at the top of the new page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
