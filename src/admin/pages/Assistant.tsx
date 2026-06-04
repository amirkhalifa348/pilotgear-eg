import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Loader2, Send, Sparkles, X } from 'lucide-react'
import { bulkUpdateProducts, formatMoney, getData, useStore } from '../../data/store'
import { computeMetrics, DAY, topProducts } from '../analytics'
import { PageHeader } from '../ui'

/* ----------------------------- types ----------------------------- */
type Block =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking?: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; tool_use_id: string; content: any; is_error?: boolean }
type ApiMessage = { role: 'user' | 'assistant'; content: string | Block[] }

type Change = { product_id: string; field: 'stock' | 'price' | 'cost' | 'compareAtPrice'; value: number }

const FIELD_LABEL: Record<Change['field'], string> = {
  stock: 'Stock',
  price: 'Price',
  cost: 'Cost',
  compareAtPrice: 'Compare-at',
}

const EXAMPLES = [
  'Which products should I restock first, and to what level?',
  'My conversion rate, what is hurting it and what should I fix first?',
  'Set every keychain to 60 units in stock.',
  'Draft a short announcement bar offer that fits the brand.',
]

/* ----------------------------- live context builder ----------------------------- */
function buildContext(): string {
  const d = getData()
  const since = Date.now() - 30 * DAY
  const m = computeMetrics(d.events, d.orders, since)
  const tops = topProducts(d.events, d.orders, d.products, since).slice(0, 6)
  const low = d.products.filter((p) => p.stock <= p.lowStockThreshold)

  const products = d.products
    .map(
      (p) =>
        `- ${p.id} | "${p.title}" | sku ${p.sku} | price ${p.price} | cost ${p.cost ?? 'n/a'} | compareAt ${p.compareAtPrice ?? 'n/a'} | stock ${p.stock} | lowAt ${p.lowStockThreshold} | ${p.active ? 'active' : 'inactive'}`,
    )
    .join('\n')

  const topLines = tops
    .map((t) => `- ${t.product.title}: ${t.qty} sold, ${formatMoney(t.revenue)} revenue, ${t.views} product views`)
    .join('\n')

  const ordersByStatus = d.orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  return [
    `## STORE SETTINGS`,
    `Name: ${d.settings.storeName} | Currency: ${d.settings.currency} | Flat shipping: ${d.settings.flatShipping} | Free shipping over: ${d.settings.freeShippingThreshold}`,
    ``,
    `## PRODUCTS (use these exact ids for changes)`,
    products,
    ``,
    `## ANALYTICS (last 30 days)`,
    `Revenue: ${formatMoney(m.revenue)} | Orders: ${m.orders} | AOV: ${formatMoney(m.aov)}`,
    `Page views: ${m.pageViews} | Product views: ${m.productViews} | Add to cart: ${m.addToCarts} | Begin checkout: ${m.checkouts} | Purchases: ${m.purchases}`,
    `Conversion rate (views→purchase): ${m.conversionRate.toFixed(2)}%`,
    `Funnel: visitor→cart ${m.visitorToCart.toFixed(1)}%, cart→checkout ${m.cartToCheckout.toFixed(1)}%, checkout→purchase ${m.checkoutToPurchase.toFixed(1)}%`,
    ``,
    `## TOP PRODUCTS (last 30 days)`,
    topLines || '(no sales/views yet)',
    ``,
    `## LOW / OUT OF STOCK`,
    low.length ? low.map((p) => `- ${p.title}: ${p.stock} left (threshold ${p.lowStockThreshold})`).join('\n') : '(none)',
    ``,
    `## ORDERS BY STATUS`,
    Object.entries(ordersByStatus).map(([s, n]) => `- ${s}: ${n}`).join('\n') || '(no orders yet)',
  ].join('\n')
}

/* ----------------------------- tool execution ----------------------------- */
function describeChange(c: Change): string {
  const p = getData().products.find((x) => x.id === c.product_id)
  const title = p ? p.title : c.product_id
  const old =
    c.field === 'stock' ? p?.stock : c.field === 'price' ? p?.price : c.field === 'cost' ? p?.cost : p?.compareAtPrice
  const fmt = (v: number | undefined) => (v === undefined ? 'n/a' : c.field === 'stock' ? `${v}` : formatMoney(v))
  return `${title} — ${FIELD_LABEL[c.field]}: ${fmt(old as number)} → ${fmt(c.value)}`
}

function applyChanges(changes: Change[]): string {
  const lines: string[] = []
  for (const c of changes) {
    const p = getData().products.find((x) => x.id === c.product_id)
    if (!p) {
      lines.push(`Skipped: unknown product id ${c.product_id}`)
      continue
    }
    bulkUpdateProducts([p.id], c.field, c.value)
    lines.push(`Applied: ${describeChange(c)}`)
  }
  return lines.join('\n')
}

/* ----------------------------- component ----------------------------- */
export default function Assistant() {
  // Keep useStore subscription so context reflects latest data when sending.
  useStore((d) => d.products)
  const [msgs, setMsgs] = useState<ApiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<{ id: string; changes: Change[] }[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollDown = () => requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }))

  async function runTurn(history: ApiMessage[]) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history, context: buildContext() }),
      })
      const data = await res.json()
      if (!res.ok || data.error || data.type === 'error') {
        setError(data.error?.message || data.error || 'The assistant could not respond. If this is local dev, run the Cloudflare Pages function with "wrangler pages dev".')
        setLoading(false)
        return
      }
      const content: Block[] = data.content || []
      const next = [...history, { role: 'assistant' as const, content }]
      setMsgs(next)

      const toolUses = content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use')
      if (toolUses.length > 0) {
        setPending(
          toolUses.map((t) => ({ id: t.id, changes: Array.isArray(t.input?.changes) ? (t.input.changes as Change[]) : [] })),
        )
      }
      setLoading(false)
      scrollDown()
    } catch {
      setError('Network error reaching the assistant. Make sure the site is deployed to Cloudflare Pages (the AI backend does not run under "npm run dev").')
      setLoading(false)
    }
  }

  function send() {
    const text = input.trim()
    if (!text || loading || pending) return
    setInput('')
    const next = [...msgs, { role: 'user' as const, content: text }]
    setMsgs(next)
    scrollDown()
    runTurn(next)
  }

  function resolvePending(approve: boolean) {
    if (!pending) return
    const results: Block[] = pending.map((t) => ({
      type: 'tool_result',
      tool_use_id: t.id,
      content: approve ? applyChanges(t.changes) || 'No changes applied.' : 'The store owner declined these changes. Do not retry unless asked.',
      is_error: !approve,
    }))
    const next: ApiMessage[] = [...msgs, { role: 'user', content: results }]
    setMsgs(next)
    setPending(null)
    scrollDown()
    runTurn(next)
  }

  // Render-friendly transcript (skip empty thinking + tool_result blocks)
  const transcript = useMemo(() => {
    const items: { role: 'user' | 'assistant'; kind: 'text' | 'action'; text?: string; changes?: Change[] }[] = []
    for (const msg of msgs) {
      if (typeof msg.content === 'string') {
        if (msg.content.trim()) items.push({ role: msg.role, kind: 'text', text: msg.content })
        continue
      }
      for (const b of msg.content) {
        if (b.type === 'text' && b.text.trim()) items.push({ role: msg.role, kind: 'text', text: b.text })
        else if (b.type === 'tool_use')
          items.push({ role: 'assistant', kind: 'action', changes: Array.isArray(b.input?.changes) ? b.input.changes : [] })
      }
    }
    return items
  }, [msgs])

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader title="AI Assistant" subtitle="Ask for advice, draft copy, or change inventory and prices by chat" />

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-navy-50 bg-white p-4 shadow-card sm:p-6">
        {transcript.length === 0 && !loading && (
          <div className="mx-auto max-w-lg py-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy text-gold"><Sparkles size={22} /></span>
            <h2 className="mt-4 font-head text-lg font-extrabold text-navy-900">Your store assistant</h2>
            <p className="mt-1 text-sm text-slatey">It knows your brand, sees your live analytics and inventory, and can make changes for you (you confirm first).</p>
            <div className="mt-5 grid gap-2 text-left">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setInput(ex)} className="rounded-xl border border-navy-100 px-4 py-2.5 text-sm font-medium text-navy-700 transition hover:border-navy-200 hover:bg-navy-50">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {transcript.map((it, i) =>
          it.kind === 'action' ? (
            <ActionCard key={i} changes={it.changes!} />
          ) : (
            <div key={i} className={it.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${it.role === 'user' ? 'bg-navy text-white' : 'bg-paper text-navy-900'}`}>
                {it.text}
              </div>
            </div>
          ),
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slatey"><Loader2 size={16} className="animate-spin" /> Thinking…</div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* Confirm-before-apply gate */}
        {pending && (
          <div className="rounded-2xl border border-gold-300 bg-gold-50 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gold-800"><AlertTriangle size={15} /> Confirm these changes before they go live</p>
            <div className="space-y-3">
              {pending.map((t) => (
                <div key={t.id} className="space-y-1.5">
                  {t.changes.length === 0 && <p className="text-sm text-navy-700">(No valid changes proposed.)</p>}
                  {t.changes.map((c, j) => (
                    <div key={j} className="rounded-lg border border-gold-200 bg-white px-3 py-2 text-sm font-medium text-navy-900">{describeChange(c)}</div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => resolvePending(true)} className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy-deep">
                <Check size={15} /> Apply changes
              </button>
              <button onClick={() => resolvePending(false)} className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-bold text-navy-700 hover:bg-navy-50">
                <X size={15} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder={pending ? 'Confirm or cancel the proposed changes above first…' : 'Ask anything, or tell it what to change…'}
          disabled={!!pending}
          className="max-h-40 min-h-[46px] flex-1 resize-none rounded-xl border border-navy-100 px-4 py-3 text-sm text-navy-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:bg-navy-50"
        />
        <button onClick={send} disabled={loading || !!pending || !input.trim()} className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl bg-navy text-white hover:bg-navy-deep disabled:opacity-40">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}

function ActionCard({ changes }: { changes: Change[] }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-green-700"><Check size={13} /> Inventory updated</p>
        <div className="space-y-1">
          {changes.map((c, i) => (
            <div key={i} className="text-sm font-medium text-navy-900">{describeChange(c)}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
