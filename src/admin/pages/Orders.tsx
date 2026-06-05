import { useMemo, useState } from 'react'
import { AlertTriangle, Phone, Search, Trash2, X } from 'lucide-react'
import { deleteOrder, formatMoney, updateOrderStatus, useStore } from '../../data/store'
import type { Order, OrderStatus } from '../../data/types'
import { PageHeader, StatusBadge } from '../ui'

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

export default function Orders() {
  const orders = useStore((d) => d.orders)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<OrderStatus | 'all'>('all')
  const [open, setOpen] = useState<Order | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const list = useMemo(() => {
    let l = orders
    if (tab !== 'all') l = l.filter((o) => o.status === tab)
    if (q) l = l.filter((o) => (`${o.number}` + o.customer.name + o.customer.phone).toLowerCase().includes(q.toLowerCase()))
    return l
  }, [orders, q, tab])

  const counts = (s: OrderStatus | 'all') => s === 'all' ? orders.length : orders.filter((o) => o.status === s).length
  const date = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders.length} total orders`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition ${tab === s ? 'bg-navy text-white' : 'bg-white text-navy-600 shadow-card hover:bg-navy-50'}`}>
            {s} <span className="opacity-60">({counts(s)})</span>
          </button>
        ))}
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slatey" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders…" className="input pl-9" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-50 bg-white shadow-card">
        <div className="hidden grid-cols-[90px_1fr_140px_110px_130px] gap-4 border-b border-navy-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slatey sm:grid">
          <span>Order</span><span>Customer</span><span>Date</span><span>Total</span><span>Status</span>
        </div>
        <div className="divide-y divide-navy-50">
          {list.map((o) => (
            <button key={o.id} onClick={() => setOpen(o)} className="grid w-full grid-cols-2 items-center gap-4 px-5 py-3 text-left transition hover:bg-navy-50 sm:grid-cols-[90px_1fr_140px_110px_130px]">
              <span className="font-bold text-navy-900">#{o.number}</span>
              <span className="truncate text-sm text-navy-700">{o.customer.name}<span className="block text-xs text-slatey sm:hidden">{date(o.createdAt)}</span></span>
              <span className="hidden text-sm text-slatey sm:block">{date(o.createdAt)}</span>
              <span className="text-sm font-bold text-navy">{formatMoney(o.total)}</span>
              <span className="justify-self-end sm:justify-self-start"><StatusBadge status={o.status} /></span>
            </button>
          ))}
          {list.length === 0 && <p className="py-16 text-center text-sm text-slatey">No orders here yet.</p>}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => { setOpen(null); setConfirmDelete(false) }}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-lift animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div><h2 className="font-head text-xl font-extrabold text-navy-900">Order #{open.number}</h2><p className="text-sm text-slatey">{date(open.createdAt)}</p></div>
              <button onClick={() => { setOpen(null); setConfirmDelete(false) }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy-50"><X /></button>
            </div>

            <div className="mt-5">
              <label className="label">Order status</label>
              <select value={open.status} onChange={(e) => { updateOrderStatus(open.id, e.target.value as OrderStatus); setOpen({ ...open, status: e.target.value as OrderStatus }) }} className="input">
                {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>

            <div className="mt-5 rounded-xl bg-paper p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slatey">Customer</h3>
              <p className="mt-2 font-semibold text-navy-900">{open.customer.name}</p>
              <a href={`tel:${open.customer.phone}`} className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-gold-600"><Phone size={14} /> {open.customer.phone}</a>
              {open.customer.email && <p className="text-sm text-navy-600">{open.customer.email}</p>}
              <p className="mt-2 text-sm text-navy-600">{open.customer.address}, {open.customer.city}, {open.customer.governorate}</p>
              {open.customer.notes && <p className="mt-2 rounded-lg bg-white p-2 text-sm text-navy-600">📝 {open.customer.notes}</p>}
            </div>

            <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-slatey">Items</h3>
            <div className="mt-2 space-y-3">
              {open.items.map((it) => (
                <div key={it.productId} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-paper"><img src={it.image} alt="" className="h-full w-full object-contain p-1" /></div>
                  <p className="flex-1 text-sm font-medium text-navy-900">{it.title}{it.variantName ? ` (${it.variantName})` : ''} <span className="text-slatey">× {it.qty}</span></p>
                  <span className="text-sm font-semibold text-navy">{formatMoney(it.price * it.qty)}</span>
                </div>
              ))}
            </div>

            <dl className="mt-5 space-y-2 border-t border-navy-50 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-navy-600">Subtotal</dt><dd>{formatMoney(open.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-600">Shipping</dt><dd>{open.shipping === 0 ? 'Free' : formatMoney(open.shipping)}</dd></div>
              <div className="flex justify-between border-t border-navy-50 pt-2 text-base font-bold"><dt className="text-navy-900">Total</dt><dd className="text-navy">{formatMoney(open.total)}</dd></div>
              <p className="pt-1 text-xs text-slatey">Payment: Cash on delivery</p>
            </dl>

            <div className="mt-6 border-t border-navy-50 pt-5">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 size={15} /> Delete order
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-2 text-sm text-red-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p>This will permanently delete order <strong>#{open.number}</strong> and remove it from all analytics. This cannot be undone.</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => { deleteOrder(open.id); setOpen(null); setConfirmDelete(false) }}
                      className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white transition hover:bg-red-600"
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-navy-50 py-2 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
