import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Boxes, ClipboardList, ExternalLink, LayoutDashboard, LayoutTemplate, LogOut, Mail, Menu, Package, Settings as SettingsIcon, ShoppingCart, Sparkles, Tags, X } from 'lucide-react'
import { adminLogout, useStore } from '../data/store'
import { supabase } from '../data/supabase'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/sales', label: 'Sales Log', icon: ClipboardList },
  { to: '/admin/messages', label: 'Messages', icon: Mail },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/collections', label: 'Collections', icon: Tags },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/pages', label: 'Page Builder', icon: LayoutTemplate },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
]

export default function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const orders = useStore((d) => d.orders)
  const pending = orders.filter((o) => o.status === 'pending').length
  const [open, setOpen] = useState(false)
  const [unreadMsgs, setUnreadMsgs] = useState(0)

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
      if (!cancelled && typeof count === 'number') setUnreadMsgs(count)
    }
    refresh()
    const ch = supabase
      .channel('messages-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refresh)
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(ch) }
  }, [])

  const SidebarContent = (
    <>
      <Link to="/admin" className="flex items-center gap-2 px-2 py-1">
        <img src="/brand/logo-white.png" alt="PilotGear EG" className="h-8" onError={(e) => ((e.target as HTMLImageElement).src = '/brand/logo.png')} />
      </Link>
      <p className="mt-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Admin</p>
      <nav className="mt-5 flex flex-1 flex-col gap-1">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-gold text-navy-deep' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
            }
          >
            <n.icon size={18} /> {n.label}
            {n.to === '/admin/orders' && pending > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{pending}</span>
            )}
            {n.to === '/admin/messages' && unreadMsgs > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy-deep">{unreadMsgs}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
          <ExternalLink size={18} /> View store
        </a>
        <button onClick={() => { adminLogout(); onLogout() }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-navy-deep p-4 lg:flex">{SidebarContent}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-navy-deep p-4">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 text-white/60"><X /></button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy-50 bg-white/90 px-5 backdrop-blur lg:px-8">
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-navy hover:bg-navy-50 lg:hidden"><Menu /></button>
          <div className="flex items-center gap-2 text-navy">
            <BarChart3 size={18} className="text-gold-500" />
            <span className="font-head font-bold">PilotGear EG Admin</span>
          </div>
        </header>
        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
