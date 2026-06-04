import { useMemo, useState } from 'react'
import { Plus, Trash2, X, ClipboardList } from 'lucide-react'
import { addSaleLog, deleteSaleLog, formatMoney, useStore } from '../../data/store'
import type { SaleChannel, SaleLogItem } from '../../data/types'
import { PageHeader } from '../ui'

const CHANNELS: { value: SaleChannel; label: string; emoji: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'phone', label: 'Phone', emoji: '📞' },
  { value: 'in_person', label: 'In Person', emoji: '🤝' },
  { value: 'other', label: 'Other', emoji: '📦' },
]

function channelLabel(c: SaleChannel) {
  return CHANNELS.find((x) => x.value === c) ?? CHANNELS[4]
}

const EMPTY_ITEM: SaleLogItem = { productId: '', title: '', qty: 1, price: 0 }

export default function SalesLog() {
  const allProducts = useStore((d) => d.products)
  const rawLogs = useStore((d) => d.saleLogs)
  const products = useMemo(() => allProducts.filter((p) => p.active), [allProducts])
  const saleLogs = useMemo(() => rawLogs ?? [], [rawLogs])
  const [open, setOpen] = useState(false)

  // form state
  const [channel, setChannel] = useState<SaleChannel>('whatsapp')
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<SaleLogItem[]>([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  const total = useMemo(() => items.reduce((s, it) => s + it.price * it.qty, 0), [items])
  const totalLogged = useMemo(() => saleLogs.reduce((s, l) => s + l.total, 0), [saleLogs])

  function resetForm() {
    setChannel('whatsapp')
    setCustomerName('')
    setNotes('')
    setItems([{ ...EMPTY_ITEM }])
  }

  function handleProductChange(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId)
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, productId, title: product?.title ?? '', price: product?.price ?? 0 }
          : it,
      ),
    )
  }

  function handleQtyChange(idx: number, qty: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, qty) } : it)))
  }

  function handlePriceChange(idx: number, price: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, price: Math.max(0, price) } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter((it) => it.productId && it.qty > 0)
    if (!validItems.length) return
    setSaving(true)
    addSaleLog({
      channel,
      customerName: customerName.trim() || undefined,
      notes: notes.trim() || undefined,
      items: validItems,
      total,
    })
    resetForm()
    setOpen(false)
    setSaving(false)
  }

  const date = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div>
      <PageHeader
        title="Sales Log"
        subtitle={`${saleLogs.length} sale${saleLogs.length !== 1 ? 's' : ''} logged`}
        action={
          <button onClick={() => setOpen(true)} className="btn-gold flex items-center gap-2">
            <Plus size={16} /> Log a sale
          </button>
        }
      />

      {/* summary strip */}
      {saleLogs.length > 0 && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
            <p className="text-sm font-semibold text-navy-600">Total logged revenue</p>
            <p className="mt-2 font-head text-2xl font-extrabold text-navy-900">{formatMoney(totalLogged)}</p>
          </div>
          <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
            <p className="text-sm font-semibold text-navy-600">Sales count</p>
            <p className="mt-2 font-head text-2xl font-extrabold text-navy-900">{saleLogs.length}</p>
          </div>
          <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
            <p className="text-sm font-semibold text-navy-600">Avg. sale value</p>
            <p className="mt-2 font-head text-2xl font-extrabold text-navy-900">
              {formatMoney(totalLogged / saleLogs.length)}
            </p>
          </div>
        </div>
      )}

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-navy-50 bg-white shadow-card">
        {saleLogs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardList size={36} className="text-navy-200" />
            <p className="font-semibold text-navy-700">No sales logged yet</p>
            <p className="text-sm text-slatey">
              Use this to record WhatsApp, phone, or in-person sales that didn't go through checkout.
            </p>
            <button onClick={() => setOpen(true)} className="btn-gold mt-1 flex items-center gap-2">
              <Plus size={15} /> Log your first sale
            </button>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_130px_110px_120px_44px] gap-4 border-b border-navy-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slatey sm:grid">
              <span>Sale</span>
              <span>Channel</span>
              <span>Date</span>
              <span>Total</span>
              <span />
            </div>
            <div className="divide-y divide-navy-50">
              {saleLogs.map((log) => {
                const ch = channelLabel(log.channel)
                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-2 items-start gap-4 px-5 py-4 sm:grid-cols-[1fr_130px_110px_120px_44px] sm:items-center"
                  >
                    {/* items summary */}
                    <div>
                      <p className="text-sm font-semibold text-navy-900">
                        {log.customerName || 'Anonymous'}
                      </p>
                      <p className="mt-0.5 text-xs text-slatey">
                        {log.items.map((it) => `${it.title} x${it.qty}`).join(', ')}
                      </p>
                      {log.notes && (
                        <p className="mt-1 text-xs italic text-slatey">{log.notes}</p>
                      )}
                    </div>
                    {/* channel */}
                    <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700 w-fit">
                      {ch.emoji} {ch.label}
                    </span>
                    {/* date */}
                    <span className="hidden text-xs text-slatey sm:block">{date(log.createdAt)}</span>
                    {/* total */}
                    <span className="text-sm font-bold text-navy">{formatMoney(log.total)}</span>
                    {/* delete */}
                    <button
                      onClick={() => {
                        if (confirm('Delete this sale log?')) deleteSaleLog(log.id)
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slatey transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* --- Log sale modal --- */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-lift animate-fade-in sm:rounded-2xl"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-head text-xl font-extrabold text-navy-900">Log a sale</h2>
              <button
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              {/* channel */}
              <div>
                <label className="label">Channel</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setChannel(c.value)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                        channel === c.value
                          ? 'bg-navy text-white'
                          : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* customer name */}
              <div>
                <label className="label">Customer name <span className="font-normal text-slatey">(optional)</span></label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ahmed Ali"
                  className="input mt-1"
                />
              </div>

              {/* items */}
              <div>
                <label className="label">Items</label>
                <div className="mt-1.5 space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={it.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="input flex-1"
                        required
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                        className="input w-16 text-center"
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        min={0}
                        value={it.price}
                        onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                        className="input w-24 text-right"
                        placeholder="Price"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slatey hover:bg-red-50 hover:text-red-500"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-gold-600"
                >
                  <Plus size={15} /> Add item
                </button>
              </div>

              {/* notes */}
              <div>
                <label className="label">Notes <span className="font-normal text-slatey">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery info, discount reason, etc."
                  className="input mt-1 h-20 resize-none"
                />
              </div>

              {/* total preview + submit */}
              <div className="flex items-center justify-between border-t border-navy-50 pt-4">
                <div>
                  <p className="text-xs text-slatey">Total</p>
                  <p className="font-head text-xl font-extrabold text-navy-900">{formatMoney(total)}</p>
                </div>
                <button
                  type="submit"
                  disabled={saving || !items.some((it) => it.productId)}
                  className="btn-gold disabled:opacity-50"
                >
                  Save sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
