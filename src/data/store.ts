import { useSyncExternalStore } from 'react'
import type { AnalyticsEvent, CartItem, Order, Product, StoreData } from './types'
import { buildSeed } from './seed'

const KEY = 'pilotgear:data:v8'
const CART_KEY = 'pilotgear:cart:v8'
const ADMIN_KEY = 'pilotgear:admin-auth'

/* ----------------------------- core store ----------------------------- */
let data: StoreData = load()
const listeners = new Set<() => void>()

function load(): StoreData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as StoreData
  } catch {}
  const seed = buildSeed()
  try { localStorage.setItem(KEY, JSON.stringify(seed)) } catch {}
  return seed
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Replace whole store (admin save) */
export function setData(updater: (d: StoreData) => StoreData) {
  data = updater(structuredClone(data))
  persist()
}

export function getData() {
  return data
}

export function resetStore() {
  data = buildSeed()
  persist()
}

export function useStore<T>(selector: (d: StoreData) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(data),
    () => selector(data),
  )
}

/* ----------------------------- products ----------------------------- */
export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}`

export function upsertProduct(product: Product) {
  setData((d) => {
    const i = d.products.findIndex((p) => p.id === product.id)
    if (i >= 0) d.products[i] = product
    else d.products.unshift(product)
    return d
  })
}

export function deleteProduct(id: string) {
  setData((d) => {
    d.products = d.products.filter((p) => p.id !== id)
    return d
  })
}

export function adjustStock(productId: string, delta: number) {
  setData((d) => {
    const p = d.products.find((x) => x.id === productId)
    if (p) p.stock = Math.max(0, p.stock + delta)
    return d
  })
}

export function setStock(productId: string, value: number) {
  setData((d) => {
    const p = d.products.find((x) => x.id === productId)
    if (p) p.stock = Math.max(0, value)
    return d
  })
}

/* ----------------------------- orders ----------------------------- */
export function createOrder(order: Omit<Order, 'id' | 'number' | 'createdAt' | 'status'>): Order {
  const full: Order = {
    ...order,
    id: uid('ord'),
    number: 1000 + data.orders.length + 1,
    createdAt: Date.now(),
    status: 'pending',
  }
  setData((d) => {
    d.orders.unshift(full)
    // decrement stock
    for (const it of full.items) {
      const p = d.products.find((x) => x.id === it.productId)
      if (p) p.stock = Math.max(0, p.stock - it.qty)
    }
    return d
  })
  track({ type: 'purchase', value: full.total, orderId: full.id })
  // push notification
  const topic = data.settings.ntfyTopic?.trim()
  if (topic) {
    const itemLines = full.items.map((it) => `  - ${it.title}${it.variantName ? ` (${it.variantName})` : ''} x${it.qty}`).join('\n')
    const body = `Order #${full.number} | ${formatMoney(full.total)}\n${full.customer.name} | ${full.customer.phone}\n${full.customer.city}, ${full.customer.governorate}\n\nItems:\n${itemLines}`
    fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: { 'Title': `New PilotGear EG Order #${full.number}`, 'Priority': 'high', 'Tags': 'airplane' },
      body,
    }).catch(() => {/* silent fail */})
  }
  return full
}

export function updateOrderStatus(id: string, status: Order['status']) {
  setData((d) => {
    const o = d.orders.find((x) => x.id === id)
    if (o) o.status = status
    return d
  })
}

/* ----------------------------- analytics ----------------------------- */
export function track(e: Omit<AnalyticsEvent, 'id' | 'ts'>) {
  const evt: AnalyticsEvent = { ...e, id: uid('ev'), ts: Date.now() }
  setData((d) => {
    d.events.push(evt)
    if (d.events.length > 5000) d.events = d.events.slice(-5000)
    return d
  })
}

/* ----------------------------- cart ----------------------------- */
let cart: CartItem[] = loadCart()
const cartListeners = new Set<() => void>()

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}
function persistCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch {}
  cartListeners.forEach((l) => l())
}
function subscribeCart(cb: () => void) {
  cartListeners.add(cb)
  return () => cartListeners.delete(cb)
}

export function useCart() {
  return useSyncExternalStore(subscribeCart, () => cart, () => cart)
}

export function addToCart(productId: string, qty = 1, variantId?: string) {
  const existing = cart.find((c) => c.productId === productId && c.variantId === variantId)
  if (existing) existing.qty += qty
  else cart = [...cart, { productId, qty, variantId }]
  cart = [...cart]
  persistCart()
  track({ type: 'add_to_cart', productId })
}

export function setCartQty(productId: string, qty: number, variantId?: string) {
  cart = cart
    .map((c) => (c.productId === productId && c.variantId === variantId ? { ...c, qty } : c))
    .filter((c) => c.qty > 0)
  persistCart()
}

export function removeFromCart(productId: string, variantId?: string) {
  cart = cart.filter((c) => !(c.productId === productId && c.variantId === variantId))
  persistCart()
}

export function clearCart() {
  cart = []
  persistCart()
}

/* ----------------------------- admin auth ----------------------------- */
export function isAdminAuthed() {
  return sessionStorage.getItem(ADMIN_KEY) === '1'
}
export function adminLogin(pw: string) {
  if (pw === data.settings.adminPassword) {
    sessionStorage.setItem(ADMIN_KEY, '1')
    return true
  }
  return false
}
export function adminLogout() {
  sessionStorage.removeItem(ADMIN_KEY)
}

/* ----------------------------- selectors / utils ----------------------------- */
export function findProduct(slug: string) {
  return data.products.find((p) => p.slug === slug)
}
export function formatMoney(n: number, currency = data.settings.currency) {
  return `${Math.round(n).toLocaleString('en-US')} ${currency}`
}
