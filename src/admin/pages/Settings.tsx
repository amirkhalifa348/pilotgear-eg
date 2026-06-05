import { useRef, useState } from 'react'
import { Download, Loader2, RotateCcw, Save, Trash2, Upload } from 'lucide-react'
import { getData, resetStore, saveAll, setData, useStore } from '../../data/store'
import type { StoreSettings } from '../../data/types'
import { PageHeader, Toast } from '../ui'

export default function Settings() {
  const settings = useStore((d) => d.settings)
  const [form, setForm] = useState<StoreSettings>(structuredClone(settings))
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setForm((f) => ({ ...f, [k]: v }))
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 1600) }

  async function save() {
    setSaving(true)
    setData((d) => { d.settings = form; return d })
    await saveAll()
    setSaving(false)
    flash('Settings saved ✓')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pilotgear-backup-${Date.now()}.json`; a.click()
  }
  function importData(file: File) {
    const r = new FileReader()
    r.onload = () => { try { const parsed = JSON.parse(r.result as string); setData(() => parsed); setForm(parsed.settings); flash('Data imported ✓') } catch { alert('Invalid backup file') } }
    r.readAsText(file)
  }
  function clearAnalytics() { if (confirm('Clear all analytics events and orders? Products are kept.')) setData((d) => { d.events = []; d.orders = []; return d }), flash('Analytics cleared') }

  const Field = ({ label, children, hint }: any) => <div><label className="label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-slatey">{hint}</p>}</div>

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Store configuration" action={<button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} {saving ? 'Saving…' : 'Save changes'}</button>} />

      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="mb-4 font-head font-bold text-navy-900">Store details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name"><input className="input" value={form.storeName} onChange={(e) => set('storeName', e.target.value)} /></Field>
            <Field label="Tagline"><input className="input" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
            <Field label="Support email"><input className="input" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
            <Field label="Support phone"><input className="input" value={form.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} /></Field>
            <Field label="WhatsApp number" hint="Digits only, e.g. 201000000000"><input className="input" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
            <Field label="Instagram handle" hint="Without @"><input className="input" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} /></Field>
          </div>
          <div className="mt-4"><Field label="Announcement bar" hint="Top banner text. Leave empty to hide."><input className="input" value={form.announcement} onChange={(e) => set('announcement', e.target.value)} /></Field></div>
        </section>

        <section className="card p-6">
          <h2 className="mb-1 font-head font-bold text-navy-900">Order notifications</h2>
          <p className="mb-4 text-sm text-slatey">Get an instant phone notification every time an order is placed. Uses <a href="https://ntfy.sh" target="_blank" rel="noreferrer" className="text-navy underline">ntfy.sh</a> (free). Install the <strong>ntfy</strong> app on your phone, then subscribe to the topic you set here.</p>
          <Field label="ntfy topic" hint="e.g. pilotgear-orders-abc123  ·  Keep it private (random suffix). Leave empty to disable.">
            <input className="input" value={form.ntfyTopic} onChange={(e) => set('ntfyTopic', e.target.value)} placeholder="pilotgear-orders-abc123" />
          </Field>
          {form.ntfyTopic && (
            <p className="mt-2 rounded-xl bg-navy-50 px-4 py-3 text-xs text-navy-700">
              Subscribe in the ntfy app to: <strong>{form.ntfyTopic}</strong> · or visit <a href={`https://ntfy.sh/${form.ntfyTopic}`} target="_blank" rel="noreferrer" className="underline">ntfy.sh/{form.ntfyTopic}</a>
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-head font-bold text-navy-900">Shipping & currency</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Currency"><input className="input" value={form.currency} onChange={(e) => set('currency', e.target.value)} /></Field>
            <Field label="Flat shipping fee"><input type="number" className="input" value={form.flatShipping} onChange={(e) => set('flatShipping', +e.target.value)} /></Field>
            <Field label="Free shipping over"><input type="number" className="input" value={form.freeShippingThreshold} onChange={(e) => set('freeShippingThreshold', +e.target.value)} /></Field>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-head font-bold text-navy-900">Security</h2>
          <Field label="Admin password" hint="Used to access this dashboard"><input className="input" value={form.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} /></Field>
        </section>

        <section className="card p-6">
          <h2 className="mb-1 font-head font-bold text-navy-900">Data management</h2>
          <p className="mb-4 text-sm text-slatey">Your store data lives in this browser. Export regular backups to keep it safe.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportData} className="btn-outline text-sm"><Download size={15} /> Export backup</button>
            <button onClick={() => fileRef.current?.click()} className="btn-outline text-sm"><Upload size={15} /> Import backup</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            <button onClick={clearAnalytics} className="btn-outline text-sm text-gold-700"><RotateCcw size={15} /> Clear orders & analytics</button>
            <button onClick={() => { if (confirm('Reset EVERYTHING to factory defaults? All products, orders and edits will be lost.')) { resetStore(); setForm(getData().settings); flash('Store reset') } }} className="btn text-sm text-red-600 hover:bg-red-50"><Trash2 size={15} /> Factory reset</button>
          </div>
        </section>
      </div>
      <Toast show={!!toast} message={toast} />
    </div>
  )
}
