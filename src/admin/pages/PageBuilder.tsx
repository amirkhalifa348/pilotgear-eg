import { useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Monitor, Plus, RotateCcw, Smartphone, Trash2, X } from 'lucide-react'
import { setData, uid, useStore } from '../../data/store'
import type { BlockType, PageBlock } from '../../data/types'
import { BLOCK_LABELS, BlockRenderer } from '../../components/storefront/blocks'
import { seedHomepage } from '../../data/seed'
import { PageHeader, Toast } from '../ui'

const ADDABLE: BlockType[] = ['hero', 'marquee', 'valueProps', 'collections', 'featured', 'banner', 'giftCta', 'testimonials', 'newsletter']

function defaultProps(type: BlockType): Record<string, any> {
  const found = seedHomepage.find((b) => b.type === type)
  if (found) return structuredClone(found.props)
  return {}
}

export default function PageBuilder() {
  const blocks = useStore((d) => d.homepage)
  const [selected, setSelected] = useState<string | null>(blocks[0]?.id ?? null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [toast, setToast] = useState('')
  const [adding, setAdding] = useState(false)

  const sel = blocks.find((b) => b.id === selected)

  const mutate = (fn: (bs: PageBlock[]) => PageBlock[]) => setData((d) => { d.homepage = fn(d.homepage); return d })
  const updateProps = (id: string, props: Record<string, any>) => mutate((bs) => bs.map((b) => b.id === id ? { ...b, props: { ...b.props, ...props } } : b))
  const toggle = (id: string) => mutate((bs) => bs.map((b) => b.id === id ? { ...b, enabled: !b.enabled } : b))
  const move = (id: string, dir: -1 | 1) => mutate((bs) => {
    const i = bs.indexOf(bs.find((b) => b.id === id)!); const j = i + dir
    if (j < 0 || j >= bs.length) return bs
    const c = [...bs];[c[i], c[j]] = [c[j], c[i]]; return c
  })
  const remove = (id: string) => { if (confirm('Remove this section?')) { mutate((bs) => bs.filter((b) => b.id !== id)); if (selected === id) setSelected(null) } }
  const add = (type: BlockType) => { const nb: PageBlock = { id: uid('b'), type, enabled: true, props: defaultProps(type) }; mutate((bs) => [...bs, nb]); setSelected(nb.id); setAdding(false) }
  const reset = () => { if (confirm('Reset homepage to the default layout?')) { setData((d) => { d.homepage = structuredClone(seedHomepage); return d }); setToast('Homepage reset'); setTimeout(() => setToast(''), 1500) } }

  return (
    <div>
      <PageHeader title="Page Builder" subtitle="Visually edit your homepage. Changes are live."
        action={<div className="flex gap-2">
          <button onClick={reset} className="btn-outline py-2 text-sm"><RotateCcw size={15} /> Reset</button>
          <a href="/" target="_blank" rel="noreferrer" className="btn-primary py-2 text-sm"><Eye size={15} /> View live</a>
        </div>} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Block list */}
        <div className="space-y-3">
          <div className="card p-3">
            <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-slatey">Sections</p>
            <div className="mt-1 space-y-1">
              {blocks.map((b, i) => (
                <div key={b.id} className={`group flex items-center gap-1.5 rounded-xl px-2 py-2 transition ${selected === b.id ? 'bg-navy-50' : 'hover:bg-paper'}`}>
                  <GripVertical size={14} className="text-navy-200" />
                  <button onClick={() => setSelected(b.id)} className={`flex-1 text-left text-sm font-semibold ${b.enabled ? 'text-navy-900' : 'text-slatey line-through'}`}>{BLOCK_LABELS[b.type]}</button>
                  <button onClick={() => move(b.id, -1)} disabled={i === 0} className="text-navy-300 hover:text-navy disabled:opacity-30"><ChevronUp size={15} /></button>
                  <button onClick={() => move(b.id, 1)} disabled={i === blocks.length - 1} className="text-navy-300 hover:text-navy disabled:opacity-30"><ChevronDown size={15} /></button>
                  <button onClick={() => toggle(b.id)} className="text-navy-300 hover:text-navy">{b.enabled ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                  <button onClick={() => remove(b.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            {adding ? (
              <div className="mt-2 rounded-xl border border-navy-50 p-2">
                <div className="flex items-center justify-between px-1"><span className="text-xs font-bold text-navy-600">Choose a section</span><button onClick={() => setAdding(false)}><X size={14} /></button></div>
                <div className="mt-1 grid gap-1">
                  {ADDABLE.map((t) => <button key={t} onClick={() => add(t)} className="rounded-lg px-2 py-1.5 text-left text-sm text-navy-700 hover:bg-navy-50">{BLOCK_LABELS[t]}</button>)}
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-100 py-2.5 text-sm font-semibold text-navy-600 hover:border-navy-300"><Plus size={15} /> Add section</button>
            )}
          </div>

          {sel && <BlockEditor key={sel.id} block={sel} onChange={(props) => updateProps(sel.id, props)} />}
        </div>

        {/* Live preview */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy-50 bg-paper px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slatey">Live preview</span>
            <div className="flex gap-1 rounded-full bg-white p-1">
              <button onClick={() => setDevice('desktop')} className={`grid h-7 w-7 place-items-center rounded-full ${device === 'desktop' ? 'bg-navy text-white' : 'text-navy-400'}`}><Monitor size={14} /></button>
              <button onClick={() => setDevice('mobile')} className={`grid h-7 w-7 place-items-center rounded-full ${device === 'mobile' ? 'bg-navy text-white' : 'text-navy-400'}`}><Smartphone size={14} /></button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto bg-navy-50/40 p-4">
            <div className={`mx-auto origin-top overflow-hidden rounded-xl bg-white shadow-card transition-all ${device === 'mobile' ? 'max-w-[390px]' : 'w-full'}`}>
              {blocks.filter((b) => b.enabled).map((b) => (
                <div key={b.id} onClick={() => setSelected(b.id)} className={`cursor-pointer ${selected === b.id ? 'ring-2 ring-inset ring-gold' : ''}`}>
                  <BlockRenderer block={b} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Toast show={!!toast} message={toast} />
    </div>
  )
}

/* ------------------------- per-type editors ------------------------- */
function T({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return <div><label className="label">{label}</label>{area ? <textarea className="input min-h-[70px]" value={value || ''} onChange={(e) => onChange(e.target.value)} /> : <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} />}</div>
}

function ImagePick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-paper"><img src={value} alt="" className="h-full w-full object-contain p-1" /></div>
        <label className="btn-outline cursor-pointer py-2 text-xs">Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => onChange(r.result as string); r.readAsDataURL(f) } }} /></label>
      </div>
    </div>
  )
}

function BlockEditor({ block, onChange }: { block: PageBlock; onChange: (props: Record<string, any>) => void }) {
  const p = block.props
  const list = (key: string) => (p[key] as any[]) || []
  const setListItem = (key: string, i: number, patch: any) => onChange({ [key]: list(key).map((x, n) => n === i ? { ...x, ...patch } : x) })
  const addListItem = (key: string, item: any) => onChange({ [key]: [...list(key), item] })
  const delListItem = (key: string, i: number) => onChange({ [key]: list(key).filter((_, n) => n !== i) })

  return (
    <div className="card space-y-4 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slatey">Edit: {BLOCK_LABELS[block.type]}</p>

      {block.type === 'hero' && <>
        <T label="Eyebrow" value={p.eyebrow} onChange={(v) => onChange({ eyebrow: v })} />
        <T label="Title" value={p.title} onChange={(v) => onChange({ title: v })} area />
        <T label="Subtitle" value={p.subtitle} onChange={(v) => onChange({ subtitle: v })} area />
        <div className="grid grid-cols-2 gap-2">
          <T label="Primary button" value={p.ctaPrimary} onChange={(v) => onChange({ ctaPrimary: v })} />
          <T label="Secondary button" value={p.ctaSecondary} onChange={(v) => onChange({ ctaSecondary: v })} />
        </div>
        <ImagePick label="Hero image" value={p.image} onChange={(v) => onChange({ image: v })} />
      </>}

      {(block.type === 'featured' || block.type === 'bestsellers' || block.type === 'collections') && <>
        <T label="Subtitle (small)" value={p.subtitle} onChange={(v) => onChange({ subtitle: v })} />
        <T label="Title" value={p.title} onChange={(v) => onChange({ title: v })} />
        {block.type === 'featured' && <p className="text-xs text-slatey">Shows products marked “Featured”. Set this on each product.</p>}
      </>}

      {block.type === 'banner' && <>
        <T label="Eyebrow" value={p.eyebrow} onChange={(v) => onChange({ eyebrow: v })} />
        <T label="Title" value={p.title} onChange={(v) => onChange({ title: v })} />
        <T label="Text" value={p.text} onChange={(v) => onChange({ text: v })} area />
        <div className="grid grid-cols-2 gap-2">
          <T label="Button label" value={p.cta} onChange={(v) => onChange({ cta: v })} />
          <T label="Button link" value={p.href} onChange={(v) => onChange({ href: v })} />
        </div>
        <ImagePick label="Image" value={p.image} onChange={(v) => onChange({ image: v })} />
      </>}

      {block.type === 'giftCta' && <>
        <T label="Title" value={p.title} onChange={(v) => onChange({ title: v })} area />
        <T label="Text" value={p.text} onChange={(v) => onChange({ text: v })} area />
        <div className="grid grid-cols-2 gap-2">
          <T label="Button label" value={p.cta} onChange={(v) => onChange({ cta: v })} />
          <T label="Button link" value={p.href} onChange={(v) => onChange({ href: v })} />
        </div>
      </>}

      {block.type === 'newsletter' && <>
        <T label="Title" value={p.title} onChange={(v) => onChange({ title: v })} />
        <T label="Text" value={p.text} onChange={(v) => onChange({ text: v })} area />
      </>}

      {block.type === 'marquee' && <>
        <label className="label">Scrolling items</label>
        {list('items').map((it: string, i: number) => (
          <div key={i} className="mb-2 flex gap-2"><input className="input" value={it} onChange={(e) => onChange({ items: list('items').map((x, n) => n === i ? e.target.value : x) })} /><button onClick={() => delListItem('items', i)} className="text-red-400"><Trash2 size={15} /></button></div>
        ))}
        <button onClick={() => addListItem('items', 'New item')} className="btn-ghost text-sm"><Plus size={14} /> Add item</button>
      </>}

      {block.type === 'valueProps' && <>
        <label className="label">Value props</label>
        {list('items').map((it: any, i: number) => (
          <div key={i} className="mb-3 rounded-xl border border-navy-50 p-3">
            <div className="flex items-center justify-between"><select className="input w-auto py-1.5 text-sm" value={it.icon} onChange={(e) => setListItem('items', i, { icon: e.target.value })}>{['truck', 'shield', 'gift', 'plane'].map((o) => <option key={o}>{o}</option>)}</select><button onClick={() => delListItem('items', i)} className="text-red-400"><Trash2 size={15} /></button></div>
            <input className="input mt-2" value={it.title} onChange={(e) => setListItem('items', i, { title: e.target.value })} placeholder="Title" />
            <input className="input mt-2" value={it.text} onChange={(e) => setListItem('items', i, { text: e.target.value })} placeholder="Text" />
          </div>
        ))}
        <button onClick={() => addListItem('items', { icon: 'plane', title: 'New', text: '' })} className="btn-ghost text-sm"><Plus size={14} /> Add</button>
      </>}

      {block.type === 'testimonials' && <>
        <T label="Title" value={p.title} onChange={(v) => onChange({ title: v })} />
        {list('items').map((it: any, i: number) => (
          <div key={i} className="mb-3 rounded-xl border border-navy-50 p-3">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-navy-600">Review {i + 1}</span><button onClick={() => delListItem('items', i)} className="text-red-400"><Trash2 size={15} /></button></div>
            <input className="input mt-2" value={it.name} onChange={(e) => setListItem('items', i, { name: e.target.value })} placeholder="Name" />
            <input className="input mt-2" value={it.role} onChange={(e) => setListItem('items', i, { role: e.target.value })} placeholder="Role" />
            <textarea className="input mt-2 min-h-[60px]" value={it.text} onChange={(e) => setListItem('items', i, { text: e.target.value })} placeholder="Review text" />
          </div>
        ))}
        <button onClick={() => addListItem('items', { name: 'Customer', role: 'Aviator', text: '' })} className="btn-ghost text-sm"><Plus size={14} /> Add review</button>
      </>}
    </div>
  )
}
