import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Instagram, Mail, Menu, ShoppingBag, X } from 'lucide-react'
import { useCart, useStore } from '../../data/store'

function cartCount(cart: { qty: number }[]) {
  return cart.reduce((n, c) => n + c.qty, 0)
}

function AnnouncementBar() {
  const announcement = useStore((d) => d.settings.announcement)
  if (!announcement) return null
  return (
    <div className="bg-navy text-white">
      <div className="container-px flex items-center justify-center py-2 text-center text-xs font-medium tracking-wide">
        {announcement}
      </div>
    </div>
  )
}

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/collections/keychains', label: 'Keychains' },
  { to: '/collections/home-desk', label: 'Home & Desk' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

function CartIcon() {
  const cart = useCart()
  const count = cartCount(cart)
  const [badgeKey, setBadgeKey] = useState(0)
  const prevCount = useRef(count)

  useEffect(() => {
    if (count > prevCount.current) {
      setBadgeKey((k) => k + 1)
    }
    prevCount.current = count
  }, [count])

  return (
    <Link to="/cart" className="relative grid h-10 w-10 place-items-center rounded-full text-navy hover:bg-navy-50" aria-label="Cart">
      <ShoppingBag className={badgeKey > 0 ? 'transition-transform duration-150' : ''} />
      {count > 0 && (
        <span
          key={badgeKey}
          className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy-deep animate-cart-pop"
        >
          {count}
        </span>
      )}
    </Link>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  return (
    <>
    <header className="sticky top-0 z-40 border-b border-navy-50 bg-white/90 backdrop-blur-md">
      <div className="container-px flex h-[72px] items-center justify-between gap-4 lg:h-24">
        <button className="lg:hidden -ml-1 grid h-10 w-10 place-items-center rounded-full text-navy hover:bg-navy-50" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </button>
        <Link to="/" className="flex items-center">
          <img src="/brand/logo.png" alt="PilotGear EG" className="h-10 w-auto sm:h-11 lg:h-16" />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-sm font-semibold transition ${isActive ? 'text-navy' : 'text-navy-600 hover:text-navy hover:bg-navy-50'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <CartIcon />
      </div>
    </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[82%] max-w-xs bg-white p-5 shadow-lift animate-fade-up">
            <div className="flex items-center justify-between">
              <img src="/brand/logo.png" alt="PilotGear EG" className="h-9" />
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-navy-50" aria-label="Close menu"><X /></button>
            </div>
            <nav className="mt-6 flex flex-col">
              {navLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-base font-semibold transition ${isActive ? 'bg-navy-50 text-navy' : 'text-navy-700 hover:bg-navy-50'}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

function Footer() {
  const s = useStore((d) => d.settings)
  const nav = useNavigate()
  return (
    <footer className="mt-20 bg-navy-deep text-white">
      <div className="container-px grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src="/brand/logo-white.png" alt="PilotGear EG" className="h-11 w-auto" onError={(e) => ((e.target as HTMLImageElement).src = '/brand/logo.png')} />
          <p className="mt-4 max-w-xs text-sm text-white/70">{s.tagline} Egypt's home for aviation keychains, accessories & gifts.</p>
          <div className="mt-5 flex gap-3">
            <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-gold hover:text-navy-deep" aria-label="Instagram"><Instagram size={18} /></a>
            <a href={`mailto:${s.supportEmail}`} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-gold hover:text-navy-deep" aria-label="Email"><Mail size={18} /></a>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-gold">Shop</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link to="/shop" className="hover:text-white">All products</Link></li>
            <li><Link to="/collections/keychains" className="hover:text-white">Keychains</Link></li>
            <li><Link to="/collections/home-desk" className="hover:text-white">Home & Desk</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-gold">Help</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link to="/contact" className="hover:text-white">Contact us</Link></li>
            <li><Link to="/shipping" className="hover:text-white">Shipping policy</Link></li>
            <li><Link to="/refund" className="hover:text-white">Refund policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms of use</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-gold">Get in touch</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><a href={`mailto:${s.supportEmail}`} className="flex items-center gap-2 hover:text-white"><Mail size={15} /> {s.supportEmail}</a></li>
            <li><a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><Instagram size={15} /> @{s.instagram}</a></li>
            <li className="flex items-center gap-2"><span className="text-base">🇪🇬</span> Delivering across Egypt</li>
          </ul>
          <p className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-xs text-white/80">💳 Cash on delivery available nationwide</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-px flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} PilotGear EG. All rights reserved.</p>
          <button onClick={() => nav('/admin')} className="text-white/40 transition hover:text-gold">Store admin</button>
        </div>
      </div>
    </footer>
  )
}

export default function StoreLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
