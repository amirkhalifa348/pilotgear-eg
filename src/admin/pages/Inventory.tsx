import { useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Minus, Plus, Search } from 'lucide-react'
import { adjustStock, formatMoney, setStock, useStore } from '../../data/store'
import { PageHeader } from '../ui'

export default function Inventory() {
  const products = useStore((d) => d.products)
  const [q, setQ] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)

  const list = useMemo(() => {
    let l = [...products].sort((a, b) => a.stock - b.stock)
    if (onlyLow) l = l.filter((p) => p.stock <= p.lowStockThreshold)
    if (q) l = l.filter((p) => (p.title + p.sku).toLowerCase().includes(q.toLowerCase()))
    return l
  }, [products, q, onlyLow])

  const totalUnits = products.reduce((s, p) => s + p.stock, 0)
  const retailValue = products.reduce((s, p) => s + p.stock * p.price, 0)
  const costValue = products.reduce((s, p) => s + p.stock * (p.cost || 0), 0)
  const lowCount = products.filter((p) => p.stock <= p.lowStockThreshold).length

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track and update stock levels" />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total units', value: totalUnits.toLocaleString(), icon: Boxes, accent: 'bg-navy-50 text-navy' },
          { label: 'Retail value', value: formatMoney(retailValue), icon: Boxes, accent: 'bg-green-50 text-green-600' },
          { label: 'Cost value', value: formatMoney(costValue), icon: Boxes, accent: 'bg-gold-50 text-gold-600' },
          { label: 'Low stock items', value: `${lowCount}`, icon: AlertTriangle, accent: 'bg-red-50 text-red-500' },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${c.accent}`}><c.icon size={17} /></span>
            <p className="mt-3 font-head text-xl font-extrabold text-navy-900">{c.value}</p>
            <p className="text-xs text-slatey">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slatey" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inventory…" className="input pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-navy-600">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="h-4 w-4 accent-navy" /> Low stock only
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-50 bg-white shadow-card">
        <div className="hidden grid-cols-[1fr_130px_90px_200px_120px] gap-4 border-b border-navy-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slatey lg:grid">
          <span>Product</span><span>SKU</span><span>Status</span><span className="text-center">Stock</span><span className="text-right">Value</span>
        </div>
        <div className="divide-y divide-navy-50">
          {list.map((p) => {
            const low = p.stock <= p.lowStockThreshold
            const out = p.stock <= 0
            return (
              <div key={p.id} className="grid grid-cols-2 items-center gap-4 px-5 py-3 lg:grid-cols-[1fr_130px_90px_200px_120px]">
                <div className="col-span-2 flex items-center gap-3 lg:col-span-1">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-paper"><img src={p.images[0]} alt="" className="h-full w-full object-contain p-1" /></div>
                  <p className="truncate font-semibold text-navy-900">{p.title}</p>
                </div>
                <span className="hidden text-sm text-slatey lg:block">{p.sku}</span>
                <span className="hidden lg:block">{out ? <span className="text-xs font-bold text-red-500">Out of stock</span> : low ? <span className="text-xs font-bold text-gold-600">Low</span> : <span className="text-xs font-bold text-green-600">In stock</span>}</span>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => adjustStock(p.id, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 text-navy hover:bg-navy-50"><Minus size={14} /></button>
                  <input type="number" value={p.stock} onChange={(e) => setStock(p.id, +e.target.value)} className={`w-16 rounded-lg border px-2 py-1.5 text-center text-sm font-bold ${low ? 'border-gold-300 text-gold-700' : 'border-navy-100 text-navy-900'}`} />
                  <button onClick={() => adjustStock(p.id, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 text-navy hover:bg-navy-50"><Plus size={14} /></button>
                </div>
                <span className="text-right text-sm font-semibold text-navy-900">{formatMoney(p.stock * p.price)}</span>
              </div>
            )
          })}
          {list.length === 0 && <p className="py-16 text-center text-sm text-slatey">No products found.</p>}
        </div>
      </div>
    </div>
  )
}
