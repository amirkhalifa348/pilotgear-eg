import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Package, Truck } from 'lucide-react'
import { formatMoney, useStore } from '../data/store'

export default function OrderConfirmation() {
  const { id } = useParams()
  const order = useStore((d) => d.orders).find((o) => o.id === id)

  if (!order) {
    return (
      <div className="container-px py-24 text-center">
        <h1 className="font-head text-2xl font-extrabold text-navy-900">Order not found</h1>
        <Link to="/shop" className="btn-primary mt-6">Back to shop</Link>
      </div>
    )
  }

  return (
    <div className="container-px py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-navy-50 bg-white p-8 text-center shadow-card sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-600 animate-fade-up"><CheckCircle2 size={36} /></div>
          <h1 className="mt-5 font-head text-3xl font-extrabold text-navy-900">Thank you, {order.customer.name.split(' ')[0]}!</h1>
          <p className="mt-2 text-navy-600">Your order <strong className="text-navy-900">#{order.number}</strong> has been placed successfully.</p>
          <p className="mt-1 text-sm text-slatey">We'll call you on {order.customer.phone} to confirm. Pay cash on delivery.</p>

          <div className="mt-8 flex items-center justify-center gap-3 text-xs font-semibold text-navy-600">
            <span className="flex items-center gap-1.5 text-gold-600"><CheckCircle2 size={16} /> Placed</span>
            <span className="h-px w-8 bg-navy-100" />
            <span className="flex items-center gap-1.5"><Package size={16} /> Packing</span>
            <span className="h-px w-8 bg-navy-100" />
            <span className="flex items-center gap-1.5"><Truck size={16} /> On the way</span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-navy-50 bg-white p-6">
          <h2 className="font-head font-bold text-navy-900">Order summary</h2>
          <div className="mt-4 space-y-3">
            {order.items.map((it) => (
              <div key={it.productId} className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-paper"><img src={it.image} alt={it.title} className="h-full w-full object-contain p-1" /></div>
                <p className="flex-1 text-sm font-medium text-navy-900">{it.title}{it.variantName ? ` (${it.variantName})` : ''} <span className="text-slatey">× {it.qty}</span></p>
                <span className="text-sm font-semibold text-navy">{formatMoney(it.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-2 border-t border-navy-50 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-navy-600">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-navy-600">Shipping</dt><dd>{order.shipping === 0 ? 'Free' : formatMoney(order.shipping)}</dd></div>
            <div className="flex justify-between border-t border-navy-50 pt-2 text-base font-bold"><dt className="text-navy-900">Total (Cash on delivery)</dt><dd className="text-navy">{formatMoney(order.total)}</dd></div>
          </dl>
          <div className="mt-5 rounded-xl bg-paper p-4 text-sm text-navy-600">
            <p className="font-semibold text-navy-900">Delivering to</p>
            <p className="mt-1">{order.customer.address}, {order.customer.city}, {order.customer.governorate}</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/shop" className="btn-primary">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}
