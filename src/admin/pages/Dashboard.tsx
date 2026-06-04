import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DollarSign, Eye, MousePointerClick, Package, Sparkles, TrendingUp } from 'lucide-react'
import { formatMoney, setData, uid, useStore } from '../../data/store'
import { computeMetrics, dailySeries, DAY, lastNDays, topProducts } from '../analytics'
import type { AnalyticsEvent, Order } from '../../data/types'

const RANGES = [{ label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: '90 days', days: 90 }]

function KpiCard({ icon: Icon, label, value, sub, accent }: any) {
  return (
    <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-navy-600">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent}`}><Icon size={17} /></span>
      </div>
      <p className="mt-3 font-head text-2xl font-extrabold text-navy-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slatey">{sub}</p>}
    </div>
  )
}

function FunnelStep({ label, value, pct, width }: { label: string; value: number; pct?: string; width: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-navy-700">{label}</span>
        <span className="text-navy-900">{value}{pct && <span className="ml-2 text-xs font-semibold text-gold-600">{pct}</span>}</span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-navy-50">
        <div className="h-full rounded-full bg-gradient-to-r from-navy to-navy-400 transition-all" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

/** Seed realistic demo analytics so the dashboard is alive on first run */
function generateDemo(productIds: string[], orderBuilder: () => void) {
  setData((d) => {
    const events: AnalyticsEvent[] = []
    const orders: Order[] = []
    const paths = ['/', '/shop', '/product/airbus-a330-keychain', '/product/remove-before-flight-tag', '/collections/aircraft', '/about']
    let orderNo = 1000
    for (let day = 29; day >= 0; day--) {
      const base = Date.now() - day * DAY
      const visits = 30 + Math.floor(Math.random() * 60)
      for (let i = 0; i < visits; i++) {
        const ts = base + Math.floor(Math.random() * DAY)
        events.push({ id: uid('ev'), type: 'page_view', ts, path: paths[Math.floor(Math.random() * paths.length)] })
        if (Math.random() < 0.5) events.push({ id: uid('ev'), type: 'product_view', ts, productId: productIds[Math.floor(Math.random() * productIds.length)] })
        if (Math.random() < 0.18) events.push({ id: uid('ev'), type: 'add_to_cart', ts, productId: productIds[Math.floor(Math.random() * productIds.length)] })
        if (Math.random() < 0.08) events.push({ id: uid('ev'), type: 'begin_checkout', ts })
      }
      const dayOrders = Math.random() < 0.8 ? 1 + Math.floor(Math.random() * 3) : 0
      for (let o = 0; o < dayOrders; o++) {
        const pid = productIds[Math.floor(Math.random() * productIds.length)]
        const p = d.products.find((x) => x.id === pid)!
        const qty = 1 + Math.floor(Math.random() * 2)
        const subtotal = p.price * qty
        const shipping = subtotal >= d.settings.freeShippingThreshold ? 0 : d.settings.flatShipping
        const ts = base + Math.floor(Math.random() * DAY)
        orderNo++
        orders.push({
          id: uid('ord'), number: orderNo, createdAt: ts,
          status: (['delivered', 'shipped', 'confirmed', 'pending'] as const)[Math.floor(Math.random() * 4)],
          items: [{ productId: p.id, title: p.title, price: p.price, qty, image: p.images[0] }],
          subtotal, shipping, total: subtotal + shipping, paymentMethod: 'cod',
          customer: { name: ['Ahmed Ali', 'Mariam Saeed', 'Omar Khaled', 'Sara Mostafa', 'Youssef Adel'][Math.floor(Math.random() * 5)], phone: '01012345678', governorate: 'Cairo', city: 'Nasr City', address: '12 Example St.' },
        })
        events.push({ id: uid('ev'), type: 'purchase', ts, value: subtotal + shipping })
      }
    }
    d.events = [...events].sort((a, b) => a.ts - b.ts)
    d.orders = [...orders, ...d.orders].sort((a, b) => b.createdAt - a.createdAt)
    return d
  })
  orderBuilder()
}

export default function Dashboard() {
  const events = useStore((d) => d.events)
  const orders = useStore((d) => d.orders)
  const products = useStore((d) => d.products)
  const [range, setRange] = useState(30)
  const sinceTs = Date.now() - range * DAY

  const m = useMemo(() => computeMetrics(events, orders, sinceTs), [events, orders, range])
  const series = useMemo(() => dailySeries(events, orders, lastNDays(range)), [events, orders, range])
  const top = useMemo(() => topProducts(events, orders, products, sinceTs).slice(0, 5), [events, orders, products, range])
  const recent = orders.slice(0, 5)
  const lowStock = products.filter((p) => p.active && p.stock <= p.lowStockThreshold)

  const hasData = events.length > 0 || orders.length > 0

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-navy-900">Dashboard</h1>
          <p className="text-sm text-slatey">Your store performance at a glance</p>
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-card">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setRange(r.days)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${range === r.days ? 'bg-navy text-white' : 'text-navy-600 hover:bg-navy-50'}`}>{r.label}</button>
          ))}
        </div>
      </div>

      {!hasData && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-navy-100 bg-white p-8 text-center sm:flex-row sm:text-left">
          <Sparkles className="text-gold" size={28} />
          <div className="flex-1">
            <p className="font-head font-bold text-navy-900">No data yet</p>
            <p className="text-sm text-slatey">Load 30 days of sample traffic & orders to preview the analytics. (You can clear it any time in Settings.)</p>
          </div>
          <button onClick={() => generateDemo(products.map((p) => p.id), () => {})} className="btn-gold whitespace-nowrap">Load demo data</button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={DollarSign} label="Revenue" value={formatMoney(m.revenue)} sub={`${m.orders} orders`} accent="bg-green-50 text-green-600" />
        <KpiCard icon={TrendingUp} label="Conversion rate" value={`${m.conversionRate.toFixed(1)}%`} sub="visits → purchases" accent="bg-navy-50 text-navy" />
        <KpiCard icon={Eye} label="Page views" value={m.pageViews.toLocaleString()} sub={`${m.productViews} product views`} accent="bg-gold-50 text-gold-600" />
        <KpiCard icon={DollarSign} label="Avg. order value" value={formatMoney(m.aov)} sub="per order" accent="bg-navy-50 text-navy" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="font-head font-bold text-navy-900">Revenue & traffic</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -18, right: 8, top: 6 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EBB63F" stopOpacity={0.5} /><stop offset="100%" stopColor="#EBB63F" stopOpacity={0} /></linearGradient>
                  <linearGradient id="vw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0E3A5C" stopOpacity={0.3} /><stop offset="100%" stopColor="#0E3A5C" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef4f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9FB2C0' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: '#9FB2C0' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #d6e4f0', fontSize: 13 }} />
                <Area type="monotone" dataKey="views" name="Views" stroke="#0E3A5C" strokeWidth={2} fill="url(#vw)" />
                <Area type="monotone" dataKey="revenue" name="Revenue (EGP)" stroke="#EBB63F" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-head font-bold text-navy-900"><MousePointerClick size={18} className="text-gold-500" /> Conversion funnel</h2>
          <div className="mt-5 space-y-4">
            <FunnelStep label="Visitors" value={m.pageViews} width={100} />
            <FunnelStep label="Added to cart" value={m.addToCarts} pct={`${m.visitorToCart.toFixed(1)}%`} width={m.pageViews ? (m.addToCarts / m.pageViews) * 100 : 0} />
            <FunnelStep label="Reached checkout" value={m.checkouts} pct={`${m.cartToCheckout.toFixed(0)}% of carts`} width={m.pageViews ? (m.checkouts / m.pageViews) * 100 : 0} />
            <FunnelStep label="Purchased" value={m.purchases} pct={`${m.checkoutToPurchase.toFixed(0)}% of checkouts`} width={m.pageViews ? (m.purchases / m.pageViews) * 100 : 0} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-head font-bold text-navy-900">Top products</h2>
            <Link to="/admin/products" className="text-sm font-semibold text-navy-600 hover:text-navy">Manage →</Link>
          </div>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.map((t) => ({ name: t.product.title.split(' ').slice(0, 2).join(' '), revenue: t.revenue }))} margin={{ left: -18, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef4f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9FB2C0' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9FB2C0' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #d6e4f0', fontSize: 13 }} cursor={{ fill: '#eef4f9' }} />
                <Bar dataKey="revenue" name="Revenue (EGP)" radius={[6, 6, 0, 0]}>
                  {top.map((_, i) => <Cell key={i} fill={i === 0 ? '#EBB63F' : '#0E3A5C'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
          <h2 className="font-head font-bold text-navy-900">Recent orders</h2>
          <div className="mt-4 space-y-3">
            {recent.length === 0 && <p className="py-6 text-center text-sm text-slatey">No orders yet</p>}
            {recent.map((o) => (
              <Link key={o.id} to="/admin/orders" className="flex items-center justify-between rounded-xl p-2 transition hover:bg-navy-50">
                <div>
                  <p className="text-sm font-semibold text-navy-900">#{o.number}</p>
                  <p className="text-xs text-slatey">{o.customer.name}</p>
                </div>
                <span className="text-sm font-bold text-navy">{formatMoney(o.total)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gold-200 bg-gold-50 p-5">
          <h2 className="flex items-center gap-2 font-head font-bold text-navy-900"><Package size={18} className="text-gold-600" /> Low stock alert</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Link key={p.id} to="/admin/inventory" className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 shadow-card hover:text-navy">
                {p.title} · <span className="text-gold-600">{p.stock} left</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
