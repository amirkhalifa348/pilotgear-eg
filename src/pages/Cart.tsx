import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react'
import { formatMoney, removeFromCart, setCartQty, useCart, useStore } from '../data/store'
import QtyStepper from '../components/ui/QtyStepper'

export default function Cart() {
  const cart = useCart()
  const products = useStore((d) => d.products)
  const settings = useStore((d) => d.settings)

  const lines = cart
    .map((c) => ({ c, p: products.find((x) => x.id === c.productId) }))
    .filter((l): l is { c: typeof cart[number]; p: NonNullable<typeof l.p> } => !!l.p)

  const subtotal = lines.reduce((s, l) => s + l.p.price * l.c.qty, 0)
  const freeShip = subtotal >= settings.freeShippingThreshold
  const shipping = lines.length === 0 ? 0 : freeShip ? 0 : settings.flatShipping
  const total = subtotal + shipping
  const toFree = Math.max(0, settings.freeShippingThreshold - subtotal)

  if (lines.length === 0) {
    return (
      <div className="container-px flex flex-col items-center py-24 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-navy-50 text-navy"><ShoppingBag size={32} /></div>
        <h1 className="mt-6 font-head text-2xl font-extrabold text-navy-900">Your cart is empty</h1>
        <p className="mt-2 text-slatey">Looks like you haven't added any gear yet.</p>
        <Link to="/shop" className="btn-primary mt-7">Start shopping <ArrowRight size={18} /></Link>
      </div>
    )
  }

  return (
    <div className="container-px py-10">
      <h1 className="font-head text-3xl font-extrabold text-navy-900">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="divide-y divide-navy-50 rounded-2xl border border-navy-50 bg-white">
          {lines.map(({ c, p }) => {
            const variant = p.variants?.find((v) => v.id === c.variantId)
            return (
            <div key={p.id + (c.variantId ?? '')} className="flex gap-4 p-4 sm:p-5">
              <Link to={`/product/${p.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-paper">
                <img src={variant?.image || p.images[0]} alt={p.title} className="h-full w-full object-contain p-2" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link to={`/product/${p.slug}`} className="font-head font-semibold text-navy-900 hover:text-navy-600">{p.title}</Link>
                    <p className="text-sm text-slatey">{variant ? `Colour: ${variant.name}` : p.subtitle}</p>
                  </div>
                  <button onClick={() => removeFromCart(p.id, c.variantId)} className="h-fit text-slatey transition hover:text-red-500" aria-label="Remove"><Trash2 size={18} /></button>
                </div>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <QtyStepper value={c.qty} onChange={(n) => setCartQty(p.id, n, c.variantId)} max={Math.max(1, p.stock)} />
                  <span className="font-head font-bold text-navy">{formatMoney(p.price * c.qty)}</span>
                </div>
              </div>
            </div>
          )})}
        </div>

        <aside className="h-fit rounded-2xl border border-navy-50 bg-white p-6 shadow-card lg:sticky lg:top-24">
          <h2 className="font-head text-lg font-bold text-navy-900">Order summary</h2>
          {!freeShip && (
            <div className="mt-4 rounded-xl bg-gold-50 p-3 text-xs font-medium text-gold-700">
              Add {formatMoney(toFree)} more for <strong>free shipping</strong>!
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gold-100">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)}%` }} />
              </div>
            </div>
          )}
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-navy-600">Subtotal</dt><dd className="font-semibold text-navy-900">{formatMoney(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-navy-600">Shipping</dt><dd className="font-semibold text-navy-900">{shipping === 0 ? <span className="text-green-600">Free</span> : formatMoney(shipping)}</dd></div>
            <div className="flex justify-between border-t border-navy-50 pt-3 text-base"><dt className="font-bold text-navy-900">Total</dt><dd className="font-head font-extrabold text-navy">{formatMoney(total)}</dd></div>
          </dl>
          <Link to="/checkout" className="btn-primary mt-6 w-full py-3.5">Proceed to checkout <ArrowRight size={18} /></Link>
          <Link to="/shop" className="mt-3 block text-center text-sm font-semibold text-navy-600 hover:text-navy">Continue shopping</Link>
        </aside>
      </div>
    </div>
  )
}
