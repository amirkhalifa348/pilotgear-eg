import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { track, useStore } from './data/store'
import { initPixel, pixel } from './lib/pixel'
import StoreLayout from './components/storefront/StoreLayout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import CollectionPage from './pages/CollectionPage'
import ProductPage from './pages/ProductPage'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import About from './pages/About'
import Contact from './pages/Contact'
import Policy from './pages/Policy'
import NotFound from './pages/NotFound'
const AdminApp = lazy(() => import('./admin/AdminApp'))

function ScrollAndTrack() {
  const loc = useLocation()
  const pixelId = useStore((d) => d.settings.facebookPixelId)

  useEffect(() => { initPixel(pixelId) }, [pixelId])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    if (!loc.pathname.startsWith('/admin')) {
      track({ type: 'page_view', path: loc.pathname })
      pixel('PageView')
    }
  }, [loc.pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollAndTrack />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/collections/:slug" element={<CollectionPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderConfirmation />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Policy kind="terms" />} />
          <Route path="/privacy" element={<Policy kind="privacy" />} />
          <Route path="/refund" element={<Policy kind="refund" />} />
          <Route path="/shipping" element={<Policy kind="shipping" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/admin/*" element={<Suspense fallback={<div className="grid min-h-screen place-items-center bg-navy text-white/70">Loading admin…</div>}><AdminApp /></Suspense>} />
      </Routes>
    </>
  )
}
