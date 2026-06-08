import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, Lock, ShieldCheck } from 'lucide-react'
import { clearCart, createOrder, formatMoney, track, useCart, useStore } from '../data/store'
import { pixel } from '../lib/pixel'
import type { OrderItem } from '../data/types'

const GOVERNORATES = ['Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Dakahlia', 'Sharqia', 'Gharbia', 'Monufia', 'Beheira', 'Kafr El Sheikh', 'Damietta', 'Port Said', 'Ismailia', 'Suez', 'Faiyum', 'Beni Suef', 'Minya', 'Asyut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'Red Sea', 'New Valley', 'Matrouh', 'North Sinai', 'South Sinai']

export default function Checkout() {
  const cart = useCart()
  const products = useStore((d) => d.products)
  const settings = useStore((d) => d.settings)
  const nav = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', governorate: 'Cairo', city: '', address: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const lines = cart.map((c) => ({ c, p: products.find((x) => x.id === c.productId) })).filter((l): l is { c: typeof cart[number]; p: NonNullable<typeof l.p> } => !!l.p)
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.c.qty, 0)
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.flatShipping
  const total = subtotal + shipping

  useEffect(() => {
    track({ type: 'begin_checkout', value: total })
    pixel('InitiateCheckout', { value: total, currency: 'EGP', num_items: lines.reduce((s, l) => s + l.c.qty, 0), content_ids: lines.map((l) => l.p.id) })
  }, [])
  useEffect(() => { if (lines.length === 0 && !submitting) nav('/cart') }, [lines.length])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!/^01[0-2,5]\d{8}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid Egyptian mobile number'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.address.trim()) e.address = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    pixel('AddPaymentInfo', { value: total, currency: 'EGP', num_items: lines.reduce((s, l) => s + l.c.qty, 0), content_ids: lines.map((l) => l.p.id) })
    const items: OrderItem[] = lines.map((l) => {
      const variant = l.p.variants?.find((v) => v.id === l.c.variantId)
      return { productId: l.p.id, title: l.p.title, variantName: variant?.name, price: l.p.price, qty: l.c.qty, image: variant?.image || l.p.images[0] }
    })
    const order = createOrder({ items, subtotal, shipping, total, paymentMethod: 'cod', customer: { ...form } })
    clearCart()
    nav(`/order/${order.id}`)
  }

  if (lines.length === 0) return null

  return (
    <div className="container-px py-10">
      <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy"><ArrowLeft size={16} /> Back to cart</Link>
      <h1 className="mt-3 font-head text-3xl font-extrabold text-navy-900">Checkout</h1>

      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-7">
          <section className="rounded-2xl border border-navy-50 bg-white p-6">
            <h2 className="font-head text-lg font-bold text-navy-900">Contact details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ahmed Hassan" />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
              <div>
                <label className="label">Phone number</label>
                <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div>
                <label className="label">Email <span className="font-normal text-slatey">(optional)</span></label>
                <input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" type="email" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-navy-50 bg-white p-6">
            <h2 className="font-head text-lg font-bold text-navy-900">Shipping address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Governorate</label>
                <select className="input" value={form.governorate} onChange={(e) => set('governorate', e.target.value)}>
                  {GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">City / Area</label>
                <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Nasr City" />
                {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="label">Street address</label>
                <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Building, street, apartment, landmark" />
                {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="label">Order notes <span className="font-normal text-slatey">(optional)</span></label>
                <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything we should know?" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-navy-50 bg-white p-6">
            <h2 className="font-head text-lg font-bold text-navy-900">Payment</h2>
            <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-gold bg-gold-50 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gold text-navy-deep"><Banknote size={20} /></div>
              <div>
                <p className="font-bold text-navy-900">Cash on Delivery</p>
                <p className="text-sm text-navy-600">Pay in cash when your order arrives. Available across Egypt.</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-navy-50 bg-white p-6 shadow-card lg:sticky lg:top-24">
          <h2 className="font-head text-lg font-bold text-navy-900">Your order</h2>
          <div className="mt-4 space-y-3">
            {lines.map(({ c, p }) => {
              const variant = p.variants?.find((v) => v.id === c.variantId)
              return (
              <div key={p.id + (c.variantId ?? '')} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-paper">
                  <img src={variant?.image || p.images[0]} alt={p.title} className="h-full w-full object-contain p-1" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-navy px-1 text-[11px] font-bold text-white">{c.qty}</span>
                </div>
                <p className="flex-1 text-sm font-medium text-navy-900">{p.title}{variant ? <span className="block text-xs text-slatey">{variant.name}</span> : null}</p>
                <span className="text-sm font-semibold text-navy">{formatMoney(p.price * c.qty)}</span>
              </div>
            )})}
          </div>
          <dl className="mt-5 space-y-2.5 border-t border-navy-50 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-navy-600">Subtotal</dt><dd className="font-semibold">{formatMoney(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-navy-600">Shipping</dt><dd className="font-semibold">{shipping === 0 ? <span className="text-green-600">Free</span> : formatMoney(shipping)}</dd></div>
            <div className="flex justify-between border-t border-navy-50 pt-3 text-base"><dt className="font-bold text-navy-900">Total</dt><dd className="font-head font-extrabold text-navy">{formatMoney(total)}</dd></div>
          </dl>
          <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full py-3.5 text-base">
            <Lock size={16} /> {submitting ? 'Placing order…' : `Place order · ${formatMoney(total)}`}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slatey"><ShieldCheck size={14} /> Your details are safe & never shared</p>
        </aside>
      </form>
    </div>
  )
}
