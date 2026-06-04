import { useMemo, useState } from 'react'
import { AlertTriangle, Boxes, CheckSquare, Minus, Plus, Search, Square, X } from 'lucide-react'
import { adjustStock, BulkField, bulkUpdateProducts, formatMoney, setStock, useStore } from '../../data/store'
import { PageHeader } from '../ui'

const BULK_FIELDS: { value: BulkField; label: string }[] = [
  { value: 'stock', label: 'Stock quantity' },
  { value: 'price', label: 'Sale price (EGP)' },
  { value: 'cost', label: 'Production cost (EGP)' },
  { value: 'compareAtPrice', label: 'Compare-at price (EGP)' },
]

export default function Inventory() {
  const products = useStore((d) => d.products)
  const [q, setQ] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkField, setBulkField] = useState<BulkField>('stock')
  const [bulkValue, setBulkValue] = useState('')

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

  const allVisibleSelected = list.length > 0 && list.every((p) => selected.has(p.id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        list.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        list.forEach((p) => next.add(p.id))
        return next
      })
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyBulk() {
    const val = parseFloat(bulkValue)
    if (isNaN(val)) return
    bulkUpdateProducts([...selected], bulkField, val)
    setBulkValue('')
  }

  function clearSelection() {
    setSelected(new Set())
    setBulkValue('')
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track and update stock levels" />

      {/* Stats — 2 cols on mobile, 4 on desktop */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: 'Total units', value: totalUnits.toLocaleString(), icon: Boxes, accent: 'bg-navy-50 text-navy' },
          { label: 'Retail value', value: formatMoney(retailValue), icon: Boxes, accent: 'bg-green-50 text-green-600' },
          { label: 'Cost value', value: formatMoney(costValue), icon: Boxes, accent: 'bg-gold-50 text-gold-600' },
          { label: 'Low stock', value: `${lowCount}`, icon: AlertTriangle, accent: 'bg-red-50 text-red-500' },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl border border-navy-50 bg-white p-4 shadow-card">
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${c.accent}`}><c.icon size={16} /></span>
            <p className="mt-2 font-head text-lg font-extrabold text-navy-900 leading-tight">{c.value}</p>
            <p className="text-xs text-slatey">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slatey" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inventory…" className="input pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-navy-600">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="h-4 w-4 accent-navy" /> Low stock
        </label>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="mb-4 rounded-2xl border border-navy-200 bg-navy-50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-navy-900">{selected.size} selected</span>
            <button onClick={clearSelection} className="flex items-center gap-1 text-xs font-semibold text-slatey hover:text-navy-900">
              <X size={13} /> Clear
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={bulkField}
              onChange={(e) => setBulkField(e.target.value as BulkField)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy sm:w-auto"
            >
              {BULK_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="New value"
                onKeyDown={(e) => e.key === 'Enter' && applyBulk()}
                className="flex-1 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy sm:w-32 sm:flex-none"
              />
              <button
                onClick={applyBulk}
                disabled={bulkValue === ''}
                className="rounded-lg bg-navy px-5 py-2 text-sm font-bold text-white hover:bg-navy-deep disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-navy-50 bg-white shadow-card">
        {/* Desktop header */}
        <div className="hidden grid-cols-[40px_1fr_130px_90px_200px_120px] gap-4 border-b border-navy-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slatey lg:grid">
          <button onClick={toggleAll} className="flex items-center text-navy">
            {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
          <span>Product</span><span>SKU</span><span>Status</span><span className="text-center">Stock</span><span className="text-right">Value</span>
        </div>

        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b border-navy-50 px-4 py-2 lg:hidden">
          <button onClick={toggleAll} className={`flex items-center ${allVisibleSelected ? 'text-navy' : 'text-navy-200'}`}>
            {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
          <span className="text-xs font-bold uppercase tracking-wide text-slatey">Select all</span>
        </div>

        <div className="divide-y divide-navy-50">
          {list.map((p) => {
            const low = p.stock <= p.lowStockThreshold
            const out = p.stock <= 0
            const checked = selected.has(p.id)
            return (
              <div key={p.id} className={checked ? 'bg-navy-50/60' : ''}>
                {/* Mobile layout */}
                <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
                  <button onClick={() => toggleOne(p.id)} className={`shrink-0 ${checked ? 'text-navy' : 'text-navy-200'}`}>
                    {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-paper">
                    <img src={p.images[0]} alt="" className="h-full w-full object-contain p-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{p.title}</p>
                    <span className="text-xs text-slatey">{p.sku}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold">
                    {out ? <span className="text-red-500">Out</span> : low ? <span className="text-gold-600">Low</span> : <span className="text-green-600">In stock</span>}
                  </span>
                </div>
                {/* Stock controls row — mobile */}
                <div className="flex items-center justify-between gap-2 px-4 pb-3 lg:hidden">
                  <div className="flex items-center gap-2">
                    <button onClick={() => adjustStock(p.id, -1)} className="grid h-9 w-9 place-items-center rounded-lg border border-navy-100 text-navy hover:bg-navy-50"><Minus size={14} /></button>
                    <input type="number" value={p.stock} onChange={(e) => setStock(p.id, +e.target.value)} className={`w-16 rounded-lg border px-2 py-1.5 text-center text-sm font-bold ${low ? 'border-gold-300 text-gold-700' : 'border-navy-100 text-navy-900'}`} />
                    <button onClick={() => adjustStock(p.id, 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-navy-100 text-navy hover:bg-navy-50"><Plus size={14} /></button>
                  </div>
                  <span className="text-sm font-semibold text-navy-900">{formatMoney(p.stock * p.price)}</span>
                </div>

                {/* Desktop layout */}
                <div className="hidden items-center gap-4 px-5 py-3 lg:grid lg:grid-cols-[40px_1fr_130px_90px_200px_120px]">
                  <button onClick={() => toggleOne(p.id)} className={`flex items-center ${checked ? 'text-navy' : 'text-navy-200 hover:text-navy'}`}>
                    {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-paper"><img src={p.images[0]} alt="" className="h-full w-full object-contain p-1" /></div>
                    <p className="truncate font-semibold text-navy-900">{p.title}</p>
                  </div>
                  <span className="text-sm text-slatey">{p.sku}</span>
                  <span>{out ? <span className="text-xs font-bold text-red-500">Out of stock</span> : low ? <span className="text-xs font-bold text-gold-600">Low</span> : <span className="text-xs font-bold text-green-600">In stock</span>}</span>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => adjustStock(p.id, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 text-navy hover:bg-navy-50"><Minus size={14} /></button>
                    <input type="number" value={p.stock} onChange={(e) => setStock(p.id, +e.target.value)} className={`w-16 rounded-lg border px-2 py-1.5 text-center text-sm font-bold ${low ? 'border-gold-300 text-gold-700' : 'border-navy-100 text-navy-900'}`} />
                    <button onClick={() => adjustStock(p.id, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 text-navy hover:bg-navy-50"><Plus size={14} /></button>
                  </div>
                  <span className="text-right text-sm font-semibold text-navy-900">{formatMoney(p.stock * p.price)}</span>
                </div>
              </div>
            )
          })}
          {list.length === 0 && <p className="py-16 text-center text-sm text-slatey">No products found.</p>}
        </div>
      </div>
    </div>
  )
}
