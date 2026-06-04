import { useSyncExternalStore } from 'react'
import type { AnalyticsEvent, CartItem, Order, Product, StoreData } from './types'
import { buildSeed } from './seed'
import { STORE_ID, supabase } from './supabase'

const KEY = 'pilotgear:data:v9'
const CART_KEY = 'pilotgear:cart:v9'
const ADMIN_KEY = 'pilotgear:admin-auth'

/** Fields synced to Supabase store_data row (not orders/events) */
type SyncedData = Omit<StoreData, 'orders' | 'events'>

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

/** Pull synced fields from a remote payload while keeping local orders/events */
function applyRemote(remote: SyncedData) {
  data = {
    ...data,
    version: remote.version,
    products: remote.products,
    collections: remote.collections,
    homepage: remote.homepage,
    settings: remote.settings,
  }
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
  listeners.forEach((l) => l())
}

/* ----------------------------- Supabase sync ----------------------------- */
let syncing = false
let pendingSync = false
let writeTimer: ReturnType<typeof setTimeout> | null = null
let suppressNextWrite = false // when we just received remote update, don't echo

function syncedPayload(d: StoreData): SyncedData {
  const { orders, events, ...rest } = d
  return rest
}

async function pushToSupabase() {
  if (syncing) { pendingSync = true; return }
  syncing = true
  try {
    const payload = syncedPayload(data)
    await supabase
      .from('store_data')
      .upsert({ id: STORE_ID, data: payload, updated_at: new Date().toISOString() })
  } catch (e) {
    console.warn('[supabase] store_data push failed:', e)
  } finally {
    syncing = false
    if (pendingSync) { pendingSync = false; queueWrite() }
  }
}

function queueWrite() {
  if (suppressNextWrite) { suppressNextWrite = false; return }
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(pushToSupabase, 350)
}

async function pullFromSupabase() {
  try {
    const { data: row, error } = await supabase
      .from('store_data')
      .select('data')
      .eq('id', STORE_ID)
      .maybeSingle()
    if (error) { console.warn('[supabase] store_data pull error', error.message); return }
    if (!row) {
      // First run on this Supabase project: seed it from local
      await pushToSupabase()
      return
    }
    suppressNextWrite = true
    applyRemote(row.data as SyncedData)
  } catch (e) {
    console.warn('[supabase] pull failed (offline?)', e)
  }
}

async function pullOrdersFromSupabase() {
  try {
    const { data: rows, error } = await supabase
      .from('orders')
      .select('data')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) { console.warn('[supabase] orders pull error', error.message); return }
    if (!rows) return
    const remoteOrders = rows.map((r) => r.data as Order)
    data = { ...data, orders: remoteOrders }
    try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
    listeners.forEach((l) => l())
  } catch (e) {
    console.warn('[supabase] orders pull failed', e)
  }
}

// Kick off initial sync + realtime subscriptions
if (typeof window !== 'undefined') {
  pullFromSupabase()
  pullOrdersFromSupabase()

  supabase
    .channel('store_data-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'store_data' }, (payload) => {
      const next = (payload.new as any)?.data
      if (next) {
        suppressNextWrite = true
        applyRemote(next as SyncedData)
      }
    })
    .subscribe()

  supabase
    .channel('orders-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
      const order = (payload.new as any)?.data as Order | undefined
      if (!order) return
      const exists = data.orders.some((o) => o.id === order.id)
      if (exists) return
      data = { ...data, orders: [order, ...data.orders] }
      try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
      listeners.forEach((l) => l())
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
      const order = (payload.new as any)?.data as Order | undefined
      if (!order) return
      data = { ...data, orders: data.orders.map((o) => o.id === order.id ? order : o) }
      try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
      listeners.forEach((l) => l())
    })
    .subscribe()
}

/** Replace whole store (admin save). Persists locally + pushes to Supabase. */
export function setData(updater: (d: StoreData) => StoreData) {
  data = updater(structuredClone(data))
  persist()
  queueWrite()
}

export function getData() {
  return data
}

export function resetStore() {
  data = buildSeed()
  persist()
  queueWrite()
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
  // local optimistic update
  data = { ...data, orders: [full, ...data.orders] }
  // decrement stock locally + sync to Supabase
  setData((d) => {
    for (const it of full.items) {
      const p = d.products.find((x) => x.id === it.productId)
      if (p) p.stock = Math.max(0, p.stock - it.qty)
    }
    return d
  })
  track({ type: 'purchase', value: full.total, orderId: full.id })

  // push order to Supabase
  supabase.from('orders').insert({
    id: full.id,
    number: full.number,
    status: full.status,
    total: full.total,
    customer_name: full.customer.name,
    customer_phone: full.customer.phone,
    customer_email: full.customer.email || null,
    data: full,
    created_at: new Date(full.createdAt).toISOString(),
  }).then(({ error }) => {
    if (error) console.warn('[supabase] order insert failed:', error.message)
  })

  // ntfy phone notification
  const topic = data.settings.ntfyTopic?.trim()
  if (topic) {
    const itemLines = full.items.map((it) => `  - ${it.title}${it.variantName ? ` (${it.variantName})` : ''} x${it.qty}`).join('\n')
    const body = `Order #${full.number} | ${formatMoney(full.total)}\n${full.customer.name} | ${full.customer.phone}\n${full.customer.city}, ${full.customer.governorate}\n\nItems:\n${itemLines}`
    fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: { 'Title': `New PilotGear EG Order #${full.number}`, 'Priority': 'high', 'Tags': 'airplane' },
      body,
    }).catch(() => {})
  }
  return full
}

export function updateOrderStatus(id: string, status: Order['status']) {
  data = { ...data, orders: data.orders.map((o) => o.id === id ? { ...o, status } : o) }
  persist()
  // persist to Supabase
  supabase
    .from('orders')
    .update({ status, data: data.orders.find((o) => o.id === id) })
    .eq('id', id)
    .then(({ error }) => { if (error) console.warn('[supabase] order update failed:', error.message) })
}

/* ----------------------------- analytics (local only) ----------------------------- */
export function track(e: Omit<AnalyticsEvent, 'id' | 'ts'>) {
  const evt: AnalyticsEvent = { ...e, id: uid('ev'), ts: Date.now() }
  // Mutate locally without triggering Supabase sync
  data = { ...data, events: [...data.events, evt].slice(-5000) }
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
  listeners.forEach((l) => l())
}

/* ----------------------------- messages ----------------------------- */
export async function sendContactMessage(input: { name: string; email: string; phone?: string; subject?: string; message: string }) {
  const { error } = await supabase.from('messages').insert({
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    subject: input.subject || null,
    message: input.message,
  })
  if (error) throw error
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
