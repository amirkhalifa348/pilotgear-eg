import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GripVertical, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import { saveAll, uid, upsertProduct, useStore } from '../../data/store'
import type { Product, ProductVariant } from '../../data/types'
import { Toast } from '../ui'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function emptyProduct(): Product {
  return {
    id: uid('p'), slug: '', title: '', subtitle: '', description: '', highlights: [''],
    specs: [{ label: '', value: '' }], price: 0, compareAtPrice: undefined, cost: undefined,
    sku: '', stock: 0, lowStockThreshold: 8, collectionId: '', tags: [], images: [],
    rating: 5, reviewCount: 0, featured: false, active: true, createdAt: Date.now(),
  }
}

export default function ProductEditor() {
  const { id } = useParams()
  const products = useStore((d) => d.products)
  const collections = useStore((d) => d.collections)
  const nav = useNavigate()
  const existing = id ? products.find((p) => p.id === id) : undefined
  const [p, setP] = useState<Product>(() => existing ? structuredClone(existing) : { ...emptyProduct(), collectionId: collections[0]?.id || '' })
  const [toast, setToast] = useState(false)
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!!existing)

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }))

  function onTitle(v: string) {
    setP((x) => ({ ...x, title: v, slug: slugTouched ? x.slug : slugify(v) }))
  }

  function addImages(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((f) => {
      const reader = new FileReader()
      reader.onload = () => setP((x) => ({ ...x, images: [...x.images, reader.result as string] }))
      reader.readAsDataURL(f)
    })
  }

  function updateVariant(i: number, patch: Partial<ProductVariant>) {
    setP((x) => ({ ...x, variants: (x.variants || []).map((v, n) => (n === i ? { ...v, ...patch } : v)) }))
  }

  function setVariantImage(i: number, file: File | null | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateVariant(i, { image: reader.result as string })
    reader.readAsDataURL(file)
  }

  function addVariant() {
    setP((x) => ({
      ...x,
      variants: [...(x.variants || []), { id: uid('v'), name: '', priceDelta: 0, stock: 0 }],
    }))
  }

  function removeVariant(i: number) {
    setP((x) => ({ ...x, variants: (x.variants || []).filter((_, n) => n !== i) }))
  }

  async function save() {
    if (!p.title.trim()) { alert('Please enter a product title'); return }
    setSaving(true)
    const final = { ...p, slug: p.slug || slugify(p.title), highlights: p.highlights.filter(Boolean), specs: p.specs.filter((s) => s.label || s.value), images: p.images.length ? p.images : ['/brand/logo.png'] }
    upsertProduct(final)
    await saveAll()
    setSaving(false)
    setToast(true)
    setTimeout(() => nav('/admin/products'), 700)
  }

  const Field = ({ label, children, hint }: any) => (
    <div><label className="label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-slatey">{hint}</p>}</div>
  )

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy"><ArrowLeft size={16} /> Back to products</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-head text-2xl font-extrabold text-navy-900">{existing ? 'Edit product' : 'New product'}</h1>
        <div className="flex gap-2">
          <Link to="/admin/products" className="btn-ghost">Cancel</Link>
          <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">{saving && <Loader2 size={16} className="animate-spin" />} {saving ? 'Saving…' : 'Save product'}</button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 font-head font-bold text-navy-900">Basics</h2>
            <div className="space-y-4">
              <Field label="Title"><input className="input" value={p.title} onChange={(e) => onTitle(e.target.value)} placeholder="Airbus A330 Keychain" /></Field>
              <Field label="Subtitle / tagline"><input className="input" value={p.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Wide-body icon in your pocket" /></Field>
              <Field label="URL handle" hint={`/product/${p.slug || 'your-handle'}`}><input className="input" value={p.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} /></Field>
              <Field label="Description"><textarea className="input min-h-[120px]" value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-head font-bold text-navy-900">Images</h2>
              <label className="btn-outline cursor-pointer py-2 text-xs"><Upload size={14} /> Upload<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} /></label>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {p.images.map((img, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-navy-50 bg-paper">
                  <img src={img} alt="" className="h-full w-full object-contain p-2" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">Main</span>}
                  <button onClick={() => set('images', p.images.filter((_, n) => n !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-red-500 opacity-0 transition group-hover:opacity-100"><X size={13} /></button>
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-navy-100 text-slatey transition hover:border-navy-300 hover:text-navy">
                <Plus size={22} /><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
              </label>
            </div>
            <p className="mt-2 text-xs text-slatey">First image is the main thumbnail. Drag-free: remove & re-add to reorder.</p>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-head font-bold text-navy-900">Highlights</h2>
            {p.highlights.map((h, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <GripVertical size={16} className="text-navy-200" />
                <input className="input" value={h} onChange={(e) => set('highlights', p.highlights.map((x, n) => n === i ? e.target.value : x))} placeholder="Premium die-cast metal body" />
                <button onClick={() => set('highlights', p.highlights.filter((_, n) => n !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => set('highlights', [...p.highlights, ''])} className="btn-ghost mt-1 text-sm"><Plus size={15} /> Add highlight</button>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-head font-bold text-navy-900">Specifications</h2>
            {p.specs.map((s, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <input className="input" value={s.label} onChange={(e) => set('specs', p.specs.map((x, n) => n === i ? { ...x, label: e.target.value } : x))} placeholder="Material" />
                <input className="input" value={s.value} onChange={(e) => set('specs', p.specs.map((x, n) => n === i ? { ...x, value: e.target.value } : x))} placeholder="Die-cast metal" />
                <button onClick={() => set('specs', p.specs.filter((_, n) => n !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => set('specs', [...p.specs, { label: '', value: '' }])} className="btn-ghost mt-1 text-sm"><Plus size={15} /> Add specification</button>
          </section>

          <section className="card p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-head font-bold text-navy-900">Variants</h2>
                <p className="mt-0.5 text-xs text-slatey">Colors, sizes, or other options. Each variant can have its own image, stock, and price adjustment.</p>
              </div>
              <button onClick={addVariant} className="btn-outline shrink-0 py-2 text-xs"><Plus size={14} /> Add variant</button>
            </div>

            {(!p.variants || p.variants.length === 0) ? (
              <p className="rounded-xl border border-dashed border-navy-100 py-6 text-center text-sm text-slatey">No variants yet. Click "Add variant" to add colors or other options.</p>
            ) : (
              <div className="space-y-3">
                {p.variants.map((v, i) => (
                  <div key={v.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-navy-50 bg-paper p-3 sm:flex-nowrap">
                    {/* Image well */}
                    <div className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-navy-100 bg-white">
                      {v.image ? (
                        <>
                          <img src={v.image} alt="" className="h-full w-full object-contain p-1" />
                          <label className="absolute inset-0 grid cursor-pointer place-items-center bg-navy/60 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                            Replace
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => setVariantImage(i, e.target.files?.[0])} />
                          </label>
                          <button onClick={() => updateVariant(i, { image: undefined })} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-red-500 shadow"><X size={11} /></button>
                        </>
                      ) : (
                        <label className="grid h-full w-full cursor-pointer place-items-center text-slatey hover:bg-navy-50 hover:text-navy">
                          <Upload size={18} />
                          <span className="mt-1 text-[10px] font-semibold">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setVariantImage(i, e.target.files?.[0])} />
                        </label>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_110px_90px]">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="label text-[11px]">Name</label>
                        <input className="input" value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} placeholder="Red" />
                      </div>
                      <div>
                        <label className="label text-[11px]">Price +/- EGP</label>
                        <input type="number" className="input" value={v.priceDelta} onChange={(e) => updateVariant(i, { priceDelta: +e.target.value })} />
                      </div>
                      <div>
                        <label className="label text-[11px]">Stock</label>
                        <input type="number" className="input" value={v.stock} onChange={(e) => updateVariant(i, { stock: +e.target.value })} />
                      </div>
                    </div>

                    <button onClick={() => removeVariant(i)} className="mt-6 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove variant"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 font-head font-bold text-navy-900">Status</h2>
            <label className="flex items-center justify-between py-2"><span className="text-sm font-semibold text-navy-700">Active (visible in shop)</span>
              <input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} className="h-5 w-5 accent-navy" /></label>
            <label className="flex items-center justify-between py-2"><span className="text-sm font-semibold text-navy-700">Featured (homepage)</span>
              <input type="checkbox" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} className="h-5 w-5 accent-navy" /></label>
            <Field label="Collection"><select className="input" value={p.collectionId} onChange={(e) => set('collectionId', e.target.value)}>{collections.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-head font-bold text-navy-900">Pricing (EGP)</h2>
            <div className="space-y-4">
              <Field label="Price"><input type="number" className="input" value={p.price} onChange={(e) => set('price', +e.target.value)} /></Field>
              <Field label="Compare-at price" hint="Shows a strikethrough discount"><input type="number" className="input" value={p.compareAtPrice ?? ''} onChange={(e) => set('compareAtPrice', e.target.value ? +e.target.value : undefined)} /></Field>
              <Field label="Cost per item" hint="For profit tracking (not shown to customers)"><input type="number" className="input" value={p.cost ?? ''} onChange={(e) => set('cost', e.target.value ? +e.target.value : undefined)} /></Field>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-head font-bold text-navy-900">Inventory</h2>
            <div className="space-y-4">
              <Field label="SKU"><input className="input" value={p.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
              <Field label="Stock quantity"><input type="number" className="input" value={p.stock} onChange={(e) => set('stock', +e.target.value)} /></Field>
              <Field label="Low-stock alert at"><input type="number" className="input" value={p.lowStockThreshold} onChange={(e) => set('lowStockThreshold', +e.target.value)} /></Field>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-head font-bold text-navy-900">Organisation</h2>
            <Field label="Tags" hint="Comma separated. Use 'best seller' for a badge."><input className="input" value={p.tags.join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} /></Field>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Rating"><input type="number" step="0.1" max="5" className="input" value={p.rating} onChange={(e) => set('rating', +e.target.value)} /></Field>
              <Field label="Reviews"><input type="number" className="input" value={p.reviewCount} onChange={(e) => set('reviewCount', +e.target.value)} /></Field>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Link to="/admin/products" className="btn-ghost">Cancel</Link>
        <button onClick={save} className="btn-primary">Save product</button>
      </div>
      <Toast show={toast} message="Product saved ✓" />
    </div>
  )
}
