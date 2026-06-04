import type { AnalyticsEvent, Order, Product } from '../data/types'

export const DAY = 86400000

export function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10)
}

export function lastNDays(n: number) {
  const days: string[] = []
  const now = Date.now()
  for (let i = n - 1; i >= 0; i--) days.push(dayKey(now - i * DAY))
  return days
}

export interface Metrics {
  revenue: number
  orders: number
  pageViews: number
  productViews: number
  addToCarts: number
  checkouts: number
  purchases: number
  visitorToCart: number
  cartToCheckout: number
  checkoutToPurchase: number
  conversionRate: number
  aov: number
}

export function computeMetrics(events: AnalyticsEvent[], orders: Order[], sinceTs: number): Metrics {
  const ev = events.filter((e) => e.ts >= sinceTs)
  const ords = orders.filter((o) => o.createdAt >= sinceTs)
  const pageViews = ev.filter((e) => e.type === 'page_view').length
  const productViews = ev.filter((e) => e.type === 'product_view').length
  const addToCarts = ev.filter((e) => e.type === 'add_to_cart').length
  const checkouts = ev.filter((e) => e.type === 'begin_checkout').length
  const purchases = ords.length
  const revenue = ords.reduce((s, o) => s + o.total, 0)
  const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)
  return {
    revenue,
    orders: purchases,
    pageViews,
    productViews,
    addToCarts,
    checkouts,
    purchases,
    visitorToCart: pct(addToCarts, pageViews),
    cartToCheckout: pct(checkouts, addToCarts),
    checkoutToPurchase: pct(purchases, checkouts),
    conversionRate: pct(purchases, pageViews),
    aov: purchases > 0 ? revenue / purchases : 0,
  }
}

export function dailySeries(events: AnalyticsEvent[], orders: Order[], days: string[]) {
  return days.map((d) => {
    const views = events.filter((e) => e.type === 'page_view' && dayKey(e.ts) === d).length
    const dayOrders = orders.filter((o) => dayKey(o.createdAt) === d)
    return {
      date: d.slice(5),
      views,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    }
  })
}

export function topProducts(events: AnalyticsEvent[], orders: Order[], products: Product[], sinceTs: number) {
  const sold: Record<string, { qty: number; revenue: number }> = {}
  for (const o of orders.filter((o) => o.createdAt >= sinceTs)) {
    for (const it of o.items) {
      sold[it.productId] = sold[it.productId] || { qty: 0, revenue: 0 }
      sold[it.productId].qty += it.qty
      sold[it.productId].revenue += it.price * it.qty
    }
  }
  const views: Record<string, number> = {}
  for (const e of events.filter((e) => e.type === 'product_view' && e.ts >= sinceTs && e.productId)) {
    views[e.productId!] = (views[e.productId!] || 0) + 1
  }
  return products
    .map((p) => ({
      product: p,
      qty: sold[p.id]?.qty || 0,
      revenue: sold[p.id]?.revenue || 0,
      views: views[p.id] || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.views - a.views)
}
