export interface ProductVariant {
  id: string
  name: string
  priceDelta: number
  stock: number
  image?: string
}

export interface Product {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  /** rich bullet highlights */
  highlights: string[]
  specs: { label: string; value: string }[]
  price: number
  compareAtPrice?: number
  cost?: number
  sku: string
  stock: number
  lowStockThreshold: number
  collectionId: string
  tags: string[]
  images: string[]
  rating: number
  reviewCount: number
  featured: boolean
  active: boolean
  variants?: ProductVariant[]
  createdAt: number
}

export interface Collection {
  id: string
  slug: string
  title: string
  description: string
  image: string
}

export interface CartItem {
  productId: string
  variantId?: string
  qty: number
}

export interface OrderItem {
  productId: string
  title: string
  variantName?: string
  price: number
  qty: number
  image: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  number: number
  createdAt: number
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  customer: {
    name: string
    phone: string
    email?: string
    governorate: string
    city: string
    address: string
    notes?: string
  }
  paymentMethod: 'cod'
}

export interface ContactMessage {
  id: string
  created_at: string
  name: string
  email: string
  phone?: string | null
  subject?: string | null
  message: string
  is_read: boolean
  replied: boolean
}

export interface AnalyticsEvent {
  id: string
  type: 'page_view' | 'product_view' | 'add_to_cart' | 'begin_checkout' | 'purchase'
  ts: number
  path?: string
  productId?: string
  value?: number
  orderId?: string
}

/* ---- Visual page builder ---- */
export type BlockType =
  | 'hero'
  | 'marquee'
  | 'featured'
  | 'collections'
  | 'banner'
  | 'valueProps'
  | 'bestsellers'
  | 'giftCta'
  | 'testimonials'
  | 'newsletter'

export interface PageBlock {
  id: string
  type: BlockType
  enabled: boolean
  props: Record<string, any>
}

export interface StoreSettings {
  storeName: string
  tagline: string
  supportEmail: string
  supportPhone: string
  whatsapp: string
  instagram: string
  currency: string
  freeShippingThreshold: number
  flatShipping: number
  announcement: string
  adminPassword: string
  ntfyTopic: string
}

export type SaleChannel = 'whatsapp' | 'instagram' | 'phone' | 'in_person' | 'other'

export interface SaleLogItem {
  productId: string
  title: string
  qty: number
  price: number
}

export interface SaleLog {
  id: string
  createdAt: number
  channel: SaleChannel
  customerName?: string
  items: SaleLogItem[]
  total: number
  notes?: string
}

export interface StoreData {
  version: number
  products: Product[]
  collections: Collection[]
  orders: Order[]
  events: AnalyticsEvent[]
  homepage: PageBlock[]
  settings: StoreSettings
  saleLogs: SaleLog[]
}
