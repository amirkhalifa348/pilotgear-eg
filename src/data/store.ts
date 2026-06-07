import { useSyncExternalStore } from 'react'
import type { AnalyticsEvent, CartItem, Order, Product, SaleLog, StoreData } from './types'
import { buildSeed } from './seed'
import { STORE_ID, SUPABASE_ANON, SUPABASE_URL, supabase } from './supabase'
import { pixel } from '../lib/pixel'

const KEY = 'pilotgear:data:v10'
const CART_KEY = 'pilotgear:cart:v10'
const ADMIN_KEY = 'pilotgear:admin-auth'
// Numeric high-water mark of the newest store_data we have pushed or pulled.
const SYNCED_AT_KEY = 'pilotgear:synced-at'
// '1' when there are local store_data edits not yet confirmed-saved to Supabase.
const DIRTY_KEY = 'pilotgear:dirty'
// Stable per-browser id so we can count unique visitors later.
const SESSION_KEY = 'pilotgear:session'

const DAY = 86400000
/** How far back the dashboard pulls events (covers the 90-day range option). */
const EVENT_WINDOW_MS = 90 * DAY

/** Fields synced to the Supabase store_data row (orders + events live in their own tables) */
type SyncedData = Omit<StoreData, 'orders' | 'events'>

/* ----------------------------- core store ----------------------------- */
let data: StoreData = load()
const listeners = new Set<() => void>()

// Sync bookkeeping (persisted so it survives a refresh).
let lastSyncedAt: number = parseInt(
  (typeof localStorage !== 'undefined' && localStorage.getItem(SYNCED_AT_KEY)) || '0',
  10,
)
let dirty: boolean =
  typeof localStorage !== 'undefined' && localStorage.getItem(DIRTY_KEY) === '1'
// Bumped on every local store_data edit; lets a push detect edits that landed
// while it was in flight (so it knows whether it fully captured the latest state).
let editSeq = 0
// When demo analytics are loaded, suppress remote pulls so they aren't wiped.
let previewMode = false

function notify() {
  listeners.forEach((l) => l())
}

function load(): StoreData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreData>
      // Normalise: events are no longer persisted locally (pulled from Supabase),
      // and older blobs may predate saleLogs.
      return {
        ...buildSeed(),
        ...parsed,
        events: [],
        saleLogs: parsed.saleLogs ?? [],
        orders: parsed.orders ?? [],
      } as StoreData
    }
  } catch {}
  const seed = buildSeed()
  writeLocalRaw(seed)
  return seed
}

/** Serialise without the volatile events array (keeps the blob small, avoids quota). */
function writeLocalRaw(d: StoreData) {
  const slim = { ...d, events: [] as AnalyticsEvent[] }
  try {
    localStorage.setItem(KEY, JSON.stringify(slim))
    return
  } catch {
    // Quota exceeded: shed order history (it lives in Supabase) and retry once.
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...slim, orders: d.orders.slice(0, 200) }))
    } catch {
      console.warn('[store] localStorage write failed (quota). Data is still synced to Supabase.')
    }
  }
}

/** Persist current in-memory data locally and notify React. Does NOT push. */
function writeLocal() {
  writeLocalRaw(data)
  notify()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Pull synced fields from a remote payload while keeping local orders/events. */
function applyRemote(remote: SyncedData) {
  data = { ...data, ...remote }
  writeLocalRaw(data)
  notify()
}

/* ----------------------------- dirty-flag helpers ----------------------------- */
function markDirty() {
  editSeq++
  dirty = true
  try { localStorage.setItem(DIRTY_KEY, '1') } catch {}
}

function setWatermark(ts: number) {
  lastSyncedAt = ts
  try { localStorage.setItem(SYNCED_AT_KEY, String(ts)) } catch {}
}

function markClean(ts: number) {
  dirty = false
  setWatermark(ts)
  try { localStorage.setItem(DIRTY_KEY, '0') } catch {}
}

/* ----------------------------- Supabase push (serialized) ----------------------------- */
function syncedPayload(d: StoreData): SyncedData {
  const { orders, events, ...rest } = d
  return rest
}

let flushing = false
let flushQueued = false
let flushPromise: Promise<boolean> = Promise.resolve(true)
let writeTimer: ReturnType<typeof setTimeout> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null

/** One upsert of the current store_data. Returns true on success. */
async function doPush(): Promise<boolean> {
  const editAtStart = editSeq
  const ts = new Date().toISOString()
  const tsMs = new Date(ts).getTime()
  try {
    const { error } = await supabase
      .from('store_data')
      .upsert({ id: STORE_ID, data: syncedPayload(data), updated_at: ts })
    if (error) {
      console.warn('[supabase] store_data push failed:', error.message)
      return false
    }
    // Advance the watermark so our own realtime echo is ignored.
    if (editSeq === editAtStart) markClean(tsMs)
    else setWatermark(tsMs) // more edits arrived mid-push — stay dirty, push again
    return true
  } catch (e) {
    console.warn('[supabase] store_data push error:', e)
    return false
  }
}

/**
 * Flush local store_data to Supabase. Safe to call concurrently: a single push
 * runs at a time and always sends the latest data; overlapping callers share the
 * same in-flight promise and its result (so a manual "Save All" never reports a
 * false failure just because a debounced push was already running).
 */
function flushToSupabase(): Promise<boolean> {
  if (flushing) { flushQueued = true; return flushPromise }
  flushing = true
  flushPromise = (async () => {
    let ok = true
    do {
      flushQueued = false
      ok = await doPush()
      if (!ok) break // stop the loop on failure; a retry is scheduled below
    } while (flushQueued)
    flushing = false
    if (!ok) scheduleRetry()
    return ok
  })()
  return flushPromise
}

function queueWrite() {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => { writeTimer = null; flushToSupabase() }, 300)
}

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(() => { retryTimer = null; if (dirty) flushToSupabase() }, 4000)
}

/** Force an immediate sync to Supabase — used by the manual "Save All" button. */
export async function saveAll(): Promise<boolean> {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null }
  return flushToSupabase()
}

/* ----------------------------- Supabase pull ----------------------------- */
async function pullFromSupabase() {
  if (previewMode) return
  // Never let a pull clobber local edits that haven't been saved yet.
  if (dirty) { flushToSupabase(); return }
  try {
    const { data: row, error } = await supabase
      .from('store_data')
      .select('data, updated_at')
      .eq('id', STORE_ID)
      .maybeSingle()
    if (error) { console.warn('[supabase] store_data pull error', error.message); return }
    if (!row) { flushToSupabase(); return } // first run on a fresh project: seed it
    const remoteTs = row.updated_at ? new Date(row.updated_at).getTime() : 0
    if (remoteTs <= lastSyncedAt) return // not newer than what we have (also ignores our echo)
    applyRemote(row.data as SyncedData)
    setWatermark(remoteTs)
  } catch (e) {
    console.warn('[supabase] store_data pull failed (offline?)', e)
  }
}

async function pullOrdersFromSupabase() {
  if (previewMode) return
  try {
    const { data: rows, error } = await supabase
      .from('orders')
      .select('data')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) { console.warn('[supabase] orders pull error', error.message); return }
    if (!rows) return
    data = { ...data, orders: rows.map((r) => r.data as Order) }
    writeLocal()
  } catch (e) {
    console.warn('[supabase] orders pull failed', e)
  }
}

async function pullEventsFromSupabase() {
  if (previewMode) return
  try {
    const since = new Date(Date.now() - EVENT_WINDOW_MS).toISOString()
    const { data: rows, error } = await supabase
      .from('events')
      .select('type, ts, path, product_id, value, order_id')
      .gte('ts', since)
      .order('ts', { ascending: true })
      .limit(20000)
    if (error) { console.warn('[supabase] events pull error', error.message); return }
    if (!rows) return
    const events: AnalyticsEvent[] = rows.map((r: any, i) => ({
      id: `db-${i}`,
      type: r.type,
      ts: new Date(r.ts).getTime(),
      path: r.path ?? undefined,
      productId: r.product_id ?? undefined,
      value: r.value ?? undefined,
      orderId: r.order_id ?? undefined,
    }))
    data = { ...data, events }
    notify()
  } catch (e) {
    console.warn('[supabase] events pull failed', e)
  }
}

/** Pull everything that lives remotely. */
function syncAll() {
  pullFromSupabase()
  pullOrdersFromSupabase()
  pullEventsFromSupabase()
}

/* ----------------------------- event ingest (batched) ----------------------------- */
type EventRow = {
  type: string
  ts: string
  path: string | null
  product_id: string | null
  value: number | null
  order_id: string | null
  session: string
}

let eventQueue: EventRow[] = []
let eventTimer: ReturnType<typeof setTimeout> | null = null

function sessionId(): string {
  try {
    let s = localStorage.getItem(SESSION_KEY)
    if (!s) { s = uid('s'); localStorage.setItem(SESSION_KEY, s) }
    return s
  } catch {
    return 'anon'
  }
}

function scheduleEventFlush() {
  if (eventTimer) return
  eventTimer = setTimeout(flushEvents, 3000)
}

async function flushEvents() {
  if (eventTimer) { clearTimeout(eventTimer); eventTimer = null }
  if (!eventQueue.length) return
  const batch = eventQueue
  eventQueue = []
  try {
    const { error } = await supabase.from('events').insert(batch)
    if (error) console.warn('[supabase] events insert failed:', error.message)
  } catch (e) {
    console.warn('[supabase] events insert error', e)
  }
}

/** Best-effort flush that survives page unload via fetch keepalive. */
function beaconEvents() {
  if (!eventQueue.length) return
  const batch = eventQueue
  eventQueue = []
  try {
    fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON,
        authorization: `Bearer ${SUPABASE_ANON}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify(batch),
    }).catch(() => {})
  } catch {}
}

/* ----------------------------- realtime + polling bootstrap ----------------------------- */
if (typeof window !== 'undefined') {
  syncAll()

  supabase
    .channel('store_data-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'store_data' }, (payload) => {
      if (previewMode || dirty) return
      const row = payload.new as any
      const remoteTs = row?.updated_at ? new Date(row.updated_at).getTime() : 0
      if (remoteTs <= lastSyncedAt) return // ignore our own echo + stale events
      if (row?.data) { applyRemote(row.data as SyncedData); setWatermark(remoteTs) }
    })
    .subscribe()

  supabase
    .channel('orders-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
      const order = (payload.new as any)?.data as Order | undefined
      if (!order || data.orders.some((o) => o.id === order.id)) return
      data = { ...data, orders: [order, ...data.orders] }
      writeLocal()
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
      const order = (payload.new as any)?.data as Order | undefined
      if (!order) return
      data = { ...data, orders: data.orders.map((o) => (o.id === order.id ? order : o)) }
      writeLocal()
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload) => {
      const id = (payload.old as any)?.id as string | undefined
      if (!id) return
      data = { ...data, orders: data.orders.filter((o) => o.id !== id) }
      writeLocal()
    })
    .subscribe()

  // Polling fallback: realtime WebSockets drop on mobile (backgrounding, network
  // switches, iOS Safari throttling). Polling guarantees freshness regardless.
  const POLL_MS = 30_000
  let pollTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (document.visibilityState === 'visible') syncAll()
  }, POLL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncAll()
    else beaconEvents()
  })
  window.addEventListener('online', syncAll)
  window.addEventListener('pagehide', beaconEvents)

  // If we refreshed with unsaved local edits, push them now.
  if (dirty) flushToSupabase()

  // Vite HMR: tear down channels/timers before this module is replaced so the
  // next hot instance can re-subscribe cleanly without the "after subscribe()" error.
  const hot = (import.meta as any).hot
  if (hot) {
    hot.dispose(() => {
      supabase.removeAllChannels()
      if (writeTimer) clearTimeout(writeTimer)
      if (retryTimer) clearTimeout(retryTimer)
      if (eventTimer) clearTimeout(eventTimer)
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = null
    })
  }
}

/* ----------------------------- public store API ----------------------------- */
/** Replace whole store (admin edit). Persists locally + pushes to Supabase. */
export function setData(updater: (d: StoreData) => StoreData) {
  data = updater(structuredClone(data))
  markDirty()
  writeLocal()
  queueWrite()
}

export function getData() {
  return data
}

export function resetStore() {
  previewMode = false
  data = buildSeed()
  markDirty()
  writeLocal()
  flushToSupabase()
  // Factory reset promises orders + analytics are wiped — clear them server-side too.
  void clearRemoteOrdersAndEvents()
}

/** Delete every order and analytics event from Supabase (irreversible). */
async function clearRemoteOrdersAndEvents() {
  try { await supabase.from('orders').delete().not('id', 'is', null) } catch (e) { console.warn('[supabase] clear orders failed', e) }
  try { await supabase.from('events').delete().not('id', 'is', null) } catch (e) { console.warn('[supabase] clear events failed', e) }
}

/** Clear orders + analytics everywhere (local + Supabase). Keeps products/settings. */
export async function clearOrdersAndAnalytics() {
  data = { ...data, orders: [], events: [] }
  writeLocal()
  await clearRemoteOrdersAndEvents()
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

export type BulkField = 'stock' | 'price' | 'cost' | 'compareAtPrice'

export function bulkUpdateProducts(ids: string[], field: BulkField, value: number) {
  setData((d) => {
    for (const p of d.products) {
      if (!ids.includes(p.id)) continue
      if (field === 'stock') p.stock = Math.max(0, value)
      else if (field === 'price') p.price = Math.max(0, value)
      else if (field === 'cost') p.cost = Math.max(0, value)
      else if (field === 'compareAtPrice') p.compareAtPrice = value > 0 ? value : undefined
    }
    return d
  })
}

/* ----------------------------- orders ----------------------------- */
/** Persist orders locally (events excluded) + notify, without touching store_data sync. */
function commitOrdersLocal() {
  writeLocal()
}

export function createOrder(order: Omit<Order, 'id' | 'number' | 'createdAt' | 'status'>): Order {
  const full: Order = {
    ...order,
    id: uid('ord'),
    number: 1000 + data.orders.length + 1,
    createdAt: Date.now(),
    status: 'pending',
  }
  // optimistic local insert
  data = { ...data, orders: [full, ...data.orders] }
  // decrement stock locally + sync store_data to Supabase
  setData((d) => {
    for (const it of full.items) {
      const p = d.products.find((x) => x.id === it.productId)
      if (p) p.stock = Math.max(0, p.stock - it.qty)
    }
    return d
  })
  track({ type: 'purchase', value: full.total, orderId: full.id })
  pixel('Purchase', {
    value: full.total,
    currency: 'EGP',
    content_ids: full.items.map((i) => i.productId),
    content_type: 'product',
    num_items: full.items.reduce((s, i) => s + i.qty, 0),
    order_id: full.id,
  })

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
  data = { ...data, orders: data.orders.map((o) => (o.id === id ? { ...o, status } : o)) }
  commitOrdersLocal()
  supabase
    .from('orders')
    .update({ status, data: data.orders.find((o) => o.id === id) })
    .eq('id', id)
    .then(({ error }) => { if (error) console.warn('[supabase] order update failed:', error.message) })
}

export function deleteOrder(id: string) {
  data = { ...data, orders: data.orders.filter((o) => o.id !== id) }
  commitOrdersLocal()
  supabase
    .from('orders')
    .delete()
    .eq('id', id)
    .then(({ error }) => { if (error) console.warn('[supabase] order delete failed:', error.message) })
}

/* ----------------------------- analytics ----------------------------- */
export function track(e: Omit<AnalyticsEvent, 'id' | 'ts'>) {
  const evt: AnalyticsEvent = { ...e, id: uid('ev'), ts: Date.now() }
  // In-memory only (events are pulled from Supabase, never persisted to localStorage).
  data = { ...data, events: [...data.events, evt].slice(-5000) }
  notify()
  if (typeof window === 'undefined' || previewMode) return
  // queue for Supabase
  eventQueue.push({
    type: evt.type,
    ts: new Date(evt.ts).toISOString(),
    path: evt.path ?? null,
    product_id: evt.productId ?? null,
    value: evt.value ?? null,
    order_id: evt.orderId ?? null,
    session: sessionId(),
  })
  // Purchases are revenue-critical — flush immediately; everything else batches.
  if (evt.type === 'purchase') flushEvents()
  else scheduleEventFlush()
}

/** Load demo analytics for preview. Local-only; suppresses remote pulls this session. */
export function loadDemo(builder: (d: StoreData) => StoreData) {
  previewMode = true
  data = builder(structuredClone(data))
  notify()
}

/* ----------------------------- sales log ----------------------------- */
export function addSaleLog(log: Omit<SaleLog, 'id' | 'createdAt'>) {
  const full: SaleLog = { ...log, id: uid('sale'), createdAt: Date.now() }
  setData((d) => {
    d.saleLogs = [full, ...(d.saleLogs ?? [])]
    return d
  })
}

export function deleteSaleLog(id: string) {
  setData((d) => {
    d.saleLogs = (d.saleLogs ?? []).filter((s) => s.id !== id)
    return d
  })
}

/* ----------------------------- image upload ----------------------------- */
/**
 * Upload an image to Supabase Storage and return its public URL.
 * Images MUST go through here, never stored as base64 in product data — a few
 * base64 images bloat the store_data blob past the localStorage limit and make
 * every save a multi-MB upload that intermittently fails.
 */
export async function uploadImage(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${uid('img')}.${ext}`
  const { error } = await supabase.storage.from('product-images').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
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
  const p = data.products.find((x) => x.id === productId)
  if (p) pixel('AddToCart', { content_ids: [productId], content_name: p.title, value: p.price * qty, currency: 'EGP', content_type: 'product' })
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
