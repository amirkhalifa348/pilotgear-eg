import { useMemo, useState } from 'react'
import { ClipboardList, DollarSign, Plus, Trash2, TrendingUp, X } from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { addSaleLog, deleteSaleLog, formatMoney, useStore } from '../../data/store'
import type { SaleChannel, SaleLog, SaleLogItem } from '../../data/types'
import { PageHeader } from '../ui'

/* ─── constants ─────────────────────────────────────────────────────── */

const CHANNELS: { value: SaleChannel; label: string; emoji: string; color: string }[] = [
  { value: 'whatsapp',  label: 'WhatsApp',  emoji: '💬', color: '#25D366' },
  { value: 'instagram', label: 'Instagram', emoji: '📸', color: '#E1306C' },
  { value: 'phone',     label: 'Phone',     emoji: '📞', color: '#0E3A5C' },
  { value: 'in_person', label: 'In Person', emoji: '🤝', color: '#EBB63F' },
  { value: 'other',     label: 'Other',     emoji: '📦', color: '#9FB2C0' },
]

const RANGES = [
  { label: 'Today',   value: 'today' },
  { label: '7 days',  value: '7d'    },
  { label: '30 days', value: '30d'   },
  { label: '90 days', value: '90d'   },
  { label: '1 year',  value: '1y'    },
  { label: 'All time',value: 'all'   },
] as const
type RangeKey = typeof RANGES[number]['value']

const DAY = 86_400_000

const EMPTY_ITEM: SaleLogItem = { productId: '', title: '', qty: 1, price: 0, cost: 0 }

/* ─── helpers ───────────────────────────────────────────────────────── */

function channelMeta(c: SaleChannel) {
  return CHANNELS.find((x) => x.value === c) ?? CHANNELS[4]
}

function sinceTs(range: RangeKey): number {
  const now = Date.now()
  switch (range) {
    case 'today': return new Date().setHours(0, 0, 0, 0)
    case '7d':    return now - 7   * DAY
    case '30d':   return now - 30  * DAY
    case '90d':   return now - 90  * DAY
    case '1y':    return now - 365 * DAY
    case 'all':   return 0
  }
}

/** Return profit for a single log entry (uses stored cost, falls back to 0) */
function logProfit(log: SaleLog): number {
  return log.items.reduce((s, it) => s + (it.price - (it.cost ?? 0)) * it.qty, 0)
}

/** Build time-series buckets for the chart */
function buildSeries(logs: SaleLog[], range: RangeKey) {
  type Bucket = { label: string; ts: number; revenue: number; profit: number }
  const buckets: Bucket[] = []
  const now = Date.now()

  if (range === 'today') {
    const dayStart = new Date().setHours(0, 0, 0, 0)
    for (let h = 0; h < 24; h++) {
      buckets.push({ label: `${h}:00`, ts: dayStart + h * 3_600_000, revenue: 0, profit: 0 })
    }
    for (const log of logs) {
      const h = new Date(log.createdAt).getHours()
      buckets[h].revenue += log.total
      buckets[h].profit  += logProfit(log)
    }

  } else if (range === '7d' || range === '30d') {
    const days = range === '7d' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY)
      d.setHours(0, 0, 0, 0)
      buckets.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), ts: d.getTime(), revenue: 0, profit: 0 })
    }
    for (const log of logs) {
      const d = new Date(log.createdAt); d.setHours(0, 0, 0, 0)
      const b = buckets.find((x) => x.ts === d.getTime())
      if (b) { b.revenue += log.total; b.profit += logProfit(log) }
    }

  } else if (range === '90d') {
    // 13 weekly buckets
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now - i * 7 * DAY)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - d.getDay()) // Sunday start
      buckets.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), ts: d.getTime(), revenue: 0, profit: 0 })
    }
    for (const log of logs) {
      const d = new Date(log.createdAt)
      d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay())
      const b = buckets.find((x) => x.ts === d.getTime())
      if (b) { b.revenue += log.total; b.profit += logProfit(log) }
    }

  } else {
    // Monthly — for 1y go back 12 months; for all use earliest log
    let startMs: number
    if (range === '1y') {
      const d = new Date(now - 365 * DAY); d.setDate(1); d.setHours(0, 0, 0, 0)
      startMs = d.getTime()
    } else {
      const earliest = logs.length ? Math.min(...logs.map((l) => l.createdAt)) : now
      const d = new Date(earliest); d.setDate(1); d.setHours(0, 0, 0, 0)
      startMs = d.getTime()
    }
    const end = new Date(); end.setDate(1); end.setHours(0, 0, 0, 0)
    const cur = new Date(startMs)
    while (cur <= end) {
      buckets.push({ label: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), ts: cur.getTime(), revenue: 0, profit: 0 })
      cur.setMonth(cur.getMonth() + 1)
    }
    for (const log of logs) {
      const d = new Date(log.createdAt); d.setDate(1); d.setHours(0, 0, 0, 0)
      const b = buckets.find((x) => x.ts === d.getTime())
      if (b) { b.revenue += log.total; b.profit += logProfit(log) }
    }
  }

  return buckets
}

/* ─── sub-components ────────────────────────────────────────────────── */

function KpiCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-navy-600">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent}`}><Icon size={17} /></span>
      </div>
      <p className="mt-3 font-head text-2xl font-extrabold text-navy-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slatey">{sub}</p>}
    </div>
  )
}

/* ─── main component ─────────────────────────────────────────────────── */

export default function SalesLog() {
  const allProducts  = useStore((d) => d.products)
  const rawLogs      = useStore((d) => d.saleLogs)
  const products     = useMemo(() => allProducts.filter((p) => p.active), [allProducts])
  const saleLogs     = useMemo(() => rawLogs ?? [], [rawLogs])

  const [range, setRange]   = useState<RangeKey>('30d')
  const [open, setOpen]     = useState(false)

  // form state
  const [channel,      setChannel]      = useState<SaleChannel>('whatsapp')
  const [customerName, setCustomerName] = useState('')
  const [notes,        setNotes]        = useState('')
  const [items,        setItems]        = useState<SaleLogItem[]>([{ ...EMPTY_ITEM }])
  const [saving,       setSaving]       = useState(false)

  /* ── filtered & analytics ── */
  const since = useMemo(() => sinceTs(range), [range])

  const filteredLogs = useMemo(
    () => saleLogs.filter((l) => l.createdAt >= since),
    [saleLogs, since],
  )

  const totalRevenue = useMemo(() => filteredLogs.reduce((s, l) => s + l.total, 0), [filteredLogs])
  const totalProfit  = useMemo(() => filteredLogs.reduce((s, l) => s + logProfit(l), 0), [filteredLogs])
  const avgMargin    = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const aov          = filteredLogs.length > 0 ? totalRevenue / filteredLogs.length : 0

  const series = useMemo(() => buildSeries(filteredLogs, range), [filteredLogs, range])

  const channelBreakdown = useMemo(() => {
    const map = new Map<SaleChannel, { revenue: number; count: number }>()
    for (const log of filteredLogs) {
      const existing = map.get(log.channel) ?? { revenue: 0, count: 0 }
      map.set(log.channel, { revenue: existing.revenue + log.total, count: existing.count + 1 })
    }
    return CHANNELS.map((c) => ({
      ...c,
      revenue: map.get(c.value)?.revenue ?? 0,
      count:   map.get(c.value)?.count   ?? 0,
    })).filter((c) => c.count > 0).sort((a, b) => b.revenue - a.revenue)
  }, [filteredLogs])

  /* ── form handlers ── */
  const formTotal = useMemo(() => items.reduce((s, it) => s + it.price * it.qty, 0), [items])

  function resetForm() {
    setChannel('whatsapp'); setCustomerName(''); setNotes('')
    setItems([{ ...EMPTY_ITEM }])
  }

  function handleProductChange(idx: number, productId: string) {
    const p = allProducts.find((x) => x.id === productId)
    setItems((prev) => prev.map((it, i) =>
      i === idx ? { ...it, productId, title: p?.title ?? '', price: p?.price ?? 0, cost: p?.cost ?? 0 } : it,
    ))
  }

  function handleItemField(idx: number, field: 'qty' | 'price' | 'cost', val: number) {
    setItems((prev) => prev.map((it, i) =>
      i === idx ? { ...it, [field]: Math.max(0, val) } : it,
    ))
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
      total: formTotal,
    })
    resetForm(); setOpen(false); setSaving(false)
  }

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  /* ── render ── */
  return (
    <div>
      <PageHeader
        title="Sales Log"
        subtitle={`${saleLogs.length} total sale${saleLogs.length !== 1 ? 's' : ''}`}
        action={
          <button onClick={() => setOpen(true)} className="btn-gold flex items-center gap-2">
            <Plus size={16} /> Log a sale
          </button>
        }
      />

      {/* Range tabs */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-card w-fit">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              range === r.value ? 'bg-navy text-white' : 'text-navy-600 hover:bg-navy-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard icon={DollarSign}  label="Revenue"      value={formatMoney(totalRevenue)} sub={`${filteredLogs.length} sale${filteredLogs.length !== 1 ? 's' : ''}`} accent="bg-green-50 text-green-600" />
        <KpiCard icon={TrendingUp}  label="Profit"       value={formatMoney(totalProfit)}  sub={`${avgMargin.toFixed(1)}% margin`}                                    accent="bg-gold-50 text-gold-600" />
        <KpiCard icon={DollarSign}  label="Avg. order"   value={formatMoney(aov)}          sub="per sale"                                                             accent="bg-navy-50 text-navy" />
        <KpiCard icon={ClipboardList} label="Sales"      value={filteredLogs.length.toString()} sub={`${RANGES.find(r => r.value === range)?.label}`}                 accent="bg-navy-50 text-navy" />
      </div>

      {saleLogs.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-navy-100 bg-white py-20 text-center">
          <ClipboardList size={36} className="text-navy-200" />
          <p className="font-semibold text-navy-700">No sales logged yet</p>
          <p className="max-w-sm text-sm text-slatey">Use this to record WhatsApp, phone, or in-person sales that didn't go through the online checkout.</p>
          <button onClick={() => setOpen(true)} className="btn-gold mt-1 flex items-center gap-2"><Plus size={15} /> Log your first sale</button>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="mb-6 rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-head font-bold text-navy-900">Revenue &amp; profit</h2>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-gold-400" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />Profit</span>
              </div>
            </div>
            <div className="h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: -18, right: 8, top: 6 }}>
                  <defs>
                    <linearGradient id="sl-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EBB63F" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#EBB63F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sl-prf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef4f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9FB2C0' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis tick={{ fontSize: 11, fill: '#9FB2C0' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #d6e4f0', fontSize: 13 }}
                    formatter={(v: number, name: string) => [formatMoney(v), name]}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#EBB63F" strokeWidth={2.5} fill="url(#sl-rev)" />
                  <Area type="monotone" dataKey="profit"  name="Profit"  stroke="#22c55e" strokeWidth={2}   fill="url(#sl-prf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Channel breakdown */}
          {channelBreakdown.length > 0 && (
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
                <h2 className="font-head font-bold text-navy-900 mb-4">By channel — revenue</h2>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={channelBreakdown.map((c) => ({ name: `${c.emoji} ${c.label}`, revenue: c.revenue }))} layout="vertical" margin={{ left: 4, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef4f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9FB2C0' }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#0E3A5C' }} tickLine={false} axisLine={false} width={100} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #d6e4f0', fontSize: 13 }} formatter={(v: number) => [formatMoney(v), 'Revenue']} />
                      <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                        {channelBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card">
                <h2 className="font-head font-bold text-navy-900 mb-4">Channel breakdown</h2>
                <div className="space-y-3">
                  {channelBreakdown.map((c) => {
                    const pct = totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0
                    return (
                      <div key={c.value}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-navy-700">{c.emoji} {c.label} <span className="text-xs font-normal text-slatey">({c.count} sale{c.count !== 1 ? 's' : ''})</span></span>
                          <span className="font-bold text-navy">{formatMoney(c.revenue)} <span className="text-xs font-normal text-slatey">{pct.toFixed(0)}%</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-navy-50">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sales table */}
          <div className="overflow-hidden rounded-2xl border border-navy-50 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-navy-50 px-5 py-3">
              <h2 className="font-head font-bold text-navy-900">Sales — {RANGES.find(r => r.value === range)?.label}</h2>
              <span className="text-sm text-slatey">{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredLogs.length === 0 ? (
              <p className="py-14 text-center text-sm text-slatey">No sales in this period.</p>
            ) : (
              <>
                <div className="hidden grid-cols-[1fr_120px_120px_100px_120px_44px] gap-4 border-b border-navy-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slatey sm:grid">
                  <span>Sale</span><span>Channel</span><span>Date</span><span>Profit</span><span>Revenue</span><span />
                </div>
                <div className="divide-y divide-navy-50">
                  {filteredLogs.map((log) => {
                    const ch  = channelMeta(log.channel)
                    const prf = logProfit(log)
                    return (
                      <div key={log.id} className="grid grid-cols-2 items-start gap-4 px-5 py-4 sm:grid-cols-[1fr_120px_120px_100px_120px_44px] sm:items-center">
                        <div>
                          <p className="text-sm font-semibold text-navy-900">{log.customerName || 'Anonymous'}</p>
                          <p className="mt-0.5 text-xs text-slatey">{log.items.map((it) => `${it.title} ×${it.qty}`).join(', ')}</p>
                          {log.notes && <p className="mt-1 text-xs italic text-slatey">{log.notes}</p>}
                        </div>
                        <span className="rounded-full px-3 py-1 text-xs font-semibold w-fit" style={{ background: ch.color + '18', color: ch.color }}>
                          {ch.emoji} {ch.label}
                        </span>
                        <span className="hidden text-xs text-slatey sm:block">{fmtDate(log.createdAt)}</span>
                        <span className={`text-sm font-bold ${prf >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatMoney(prf)}</span>
                        <span className="text-sm font-bold text-navy">{formatMoney(log.total)}</span>
                        <button
                          onClick={() => { if (confirm('Delete this sale log?')) deleteSaleLog(log.id) }}
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
        </>
      )}

      {/* ── Log sale modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-lift animate-fade-in sm:rounded-2xl"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-head text-xl font-extrabold text-navy-900">Log a sale</h2>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy-50"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              {/* channel */}
              <div>
                <label className="label">Channel</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <button key={c.value} type="button" onClick={() => setChannel(c.value)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                        channel === c.value ? 'bg-navy text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* customer */}
              <div>
                <label className="label">Customer name <span className="font-normal text-slatey">(optional)</span></label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Ahmed Ali" className="input mt-1" />
              </div>

              {/* items */}
              <div>
                <label className="label">Items</label>
                <div className="mt-1.5 space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="rounded-xl border border-navy-100 bg-paper p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select value={it.productId} onChange={(e) => handleProductChange(idx, e.target.value)} className="input flex-1" required>
                          <option value="">Select product…</option>
                          {allProducts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                        {items.length > 1 && (
                          <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slatey hover:bg-red-50 hover:text-red-500">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="mb-1 font-semibold text-slatey">Qty</p>
                          <input type="number" min={1} value={it.qty} onChange={(e) => handleItemField(idx, 'qty', +e.target.value)} className="input text-center w-full" />
                        </div>
                        <div>
                          <p className="mb-1 font-semibold text-slatey">Sale price</p>
                          <input type="number" min={0} value={it.price} onChange={(e) => handleItemField(idx, 'price', +e.target.value)} className="input text-right w-full" />
                        </div>
                        <div>
                          <p className="mb-1 font-semibold text-slatey">Cost price</p>
                          <input type="number" min={0} value={it.cost} onChange={(e) => handleItemField(idx, 'cost', +e.target.value)} className="input text-right w-full" />
                        </div>
                      </div>
                      {it.productId && (
                        <p className="text-xs text-slatey">
                          Profit: <span className={`font-bold ${(it.price - it.cost) * it.qty >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatMoney((it.price - it.cost) * it.qty)}
                          </span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
                  className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-gold-600">
                  <Plus size={15} /> Add item
                </button>
              </div>

              {/* notes */}
              <div>
                <label className="label">Notes <span className="font-normal text-slatey">(optional)</span></label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery info, discount, etc." className="input mt-1 h-20 resize-none" />
              </div>

              {/* summary + submit */}
              <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 border-t border-navy-50">
                <div className="space-y-0.5">
                  <p className="text-xs text-slatey">Total revenue</p>
                  <p className="font-head text-xl font-extrabold text-navy-900">{formatMoney(formTotal)}</p>
                  <p className="text-xs text-slatey">
                    Est. profit: <span className="font-semibold text-green-600">{formatMoney(items.reduce((s, it) => s + (it.price - it.cost) * it.qty, 0))}</span>
                  </p>
                </div>
                <button type="submit" disabled={saving || !items.some((it) => it.productId)} className="btn-gold disabled:opacity-50">
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
