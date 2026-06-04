import { useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { setData, uid, useStore } from '../../data/store'
import type { Collection } from '../../data/types'
import { PageHeader } from '../ui'

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

export default function Collections() {
  const collections = useStore((d) => d.collections)
  const products = useStore((d) => d.products)
  const [edit, setEdit] = useState<Collection | null>(null)

  function save(c: Collection) {
    setData((d) => {
      const i = d.collections.findIndex((x) => x.id === c.id)
      if (i >= 0) d.collections[i] = c; else d.collections.push(c)
      return d
    })
    setEdit(null)
  }
  function remove(id: string) {
    const count = products.filter((p) => p.collectionId === id).length
    if (count > 0) { alert(`Move or delete the ${count} product(s) in this collection first.`); return }
    if (confirm('Delete this collection?')) setData((d) => { d.collections = d.collections.filter((c) => c.id !== id); return d })
  }

  return (
    <div>
      <PageHeader title="Collections" subtitle={`${collections.length} collections`}
        action={<button onClick={() => setEdit({ id: uid('col'), slug: '', title: '', description: '', image: '/brand/logo.png' })} className="btn-primary"><Plus size={18} /> Add collection</button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <div key={c.id} className="card overflow-hidden">
            <div className="aspect-[16/9] bg-paper"><img src={c.image} alt={c.title} className="h-full w-full object-contain p-6" /></div>
            <div className="p-5">
              <h3 className="font-head font-bold text-navy-900">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slatey">{c.description}</p>
              <p className="mt-2 text-xs font-semibold text-navy-600">{products.filter((p) => p.collectionId === c.id).length} products</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEdit(structuredClone(c))} className="btn-outline flex-1 py-2 text-sm"><Pencil size={15} /> Edit</button>
                <button onClick={() => remove(c.id)} className="grid h-10 w-10 place-items-center rounded-full border border-red-100 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="font-head text-lg font-bold text-navy-900">{collections.find((c) => c.id === edit.id) ? 'Edit' : 'New'} collection</h2><button onClick={() => setEdit(null)}><X /></button></div>
            <div className="mt-4 space-y-4">
              <div><label className="label">Title</label><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value, slug: edit.slug || slugify(e.target.value) })} /></div>
              <div><label className="label">URL handle</label><input className="input" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} /></div>
              <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              <div><label className="label">Image</label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-paper"><img src={edit.image} alt="" className="h-full w-full object-contain p-1" /></div>
                  <label className="btn-outline cursor-pointer py-2 text-sm">Upload image<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setEdit({ ...edit, image: r.result as string }); r.readAsDataURL(f) } }} /></label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => save({ ...edit, slug: edit.slug || slugify(edit.title) })} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
