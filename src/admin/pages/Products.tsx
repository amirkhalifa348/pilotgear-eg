import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { deleteProduct, formatMoney, uid, upsertProduct, useStore } from '../../data/store'
import { PageHeader, StatusBadge } from '../ui'

export default function Products() {
  const products = useStore((d) => d.products)
  const collections = useStore((d) => d.collections)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const list = useMemo(() => {
    let l = products
    if (filter !== 'all') l = l.filter((p) => p.collectionId === filter)
    if (q) l = l.filter((p) => (p.title + p.sku + p.tags.join(' ')).toLowerCase().includes(q.toLowerCase()))
    return l
  }, [products, q, filter])

  const colName = (id: string) => collections.find((c) => c.id === id)?.title || '-'

  function duplicate(id: string) {
    const p = products.find((x) => x.id === id)
    if (!p) return
    upsertProduct({ ...structuredClone(p), id: uid('p'), slug: `${p.slug}-copy-${Math.random().toString(36).slice(2, 5)}`, title: `${p.title} (Copy)`, sku: `${p.sku}-C`, createdAt: Date.now() })
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} products`}
        action={<Link to="/admin/products/new" className="btn-primary"><Plus size={18} /> Add product</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slatey" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="input pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto">
          <option value="all">All collections</option>
          {collections.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-50 bg-white shadow-card">
        <div className="hidden grid-cols-[1fr_140px_110px_90px_110px_120px] gap-4 border-b border-navy-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slatey lg:grid">
          <span>Product</span><span>Collection</span><span>Price</span><span>Stock</span><span>Status</span><span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-navy-50">
          {list.map((p) => (
            <div key={p.id} className="grid grid-cols-2 items-center gap-4 px-5 py-3 lg:grid-cols-[1fr_140px_110px_90px_110px_120px]">
              <div className="col-span-2 flex items-center gap-3 lg:col-span-1">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-paper"><img src={p.images[0]} alt="" className="h-full w-full object-contain p-1" /></div>
                <div className="min-w-0">
                  <button onClick={() => nav(`/admin/products/${p.id}`)} className="block truncate text-left font-semibold text-navy-900 hover:text-navy-600">{p.title}</button>
                  <p className="truncate text-xs text-slatey">{p.sku}</p>
                </div>
              </div>
              <span className="hidden text-sm text-navy-600 lg:block">{colName(p.collectionId)}</span>
              <span className="text-sm font-semibold text-navy-900 lg:text-sm">{formatMoney(p.price)}</span>
              <span className={`text-sm font-semibold ${p.stock <= p.lowStockThreshold ? 'text-gold-600' : 'text-navy-900'}`}>{p.stock}</span>
              <span className="hidden lg:block"><StatusBadge status={p.active ? 'active' : 'draft'} /></span>
              <div className="col-span-2 flex justify-end gap-1 lg:col-span-1">
                <button onClick={() => nav(`/admin/products/${p.id}`)} className="grid h-9 w-9 place-items-center rounded-lg text-navy-600 hover:bg-navy-50" title="Edit"><Pencil size={16} /></button>
                <button onClick={() => duplicate(p.id)} className="grid h-9 w-9 place-items-center rounded-lg text-navy-600 hover:bg-navy-50" title="Duplicate"><Copy size={16} /></button>
                <button onClick={() => { if (confirm(`Delete "${p.title}"? This cannot be undone.`)) deleteProduct(p.id) }} className="grid h-9 w-9 place-items-center rounded-lg text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="py-16 text-center text-sm text-slatey">No products found.</p>}
        </div>
      </div>
    </div>
  )
}
