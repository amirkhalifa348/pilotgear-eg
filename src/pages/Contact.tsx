import { useState } from 'react'
import { Instagram, Loader2, Mail, MapPin, Send } from 'lucide-react'
import { sendContactMessage, useStore } from '../data/store'
import { pixel } from '../lib/pixel'

export default function Contact() {
  const s = useStore((d) => d.settings)
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      await sendContactMessage(form)
      pixel('Lead', { content_name: form.subject || 'Contact form' })
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Could not send. Please try again or email us directly.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container-px py-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-head text-3xl font-extrabold text-navy-900 sm:text-4xl">Get in touch</h1>
        <p className="mt-2 max-w-xl text-navy-600">Questions about an order, a product or a bulk gift? We'd love to help. Reach out any time.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            {[
              { icon: Mail, label: 'Email', value: s.supportEmail, href: `mailto:${s.supportEmail}` },
              { icon: Instagram, label: 'Instagram', value: `@${s.instagram}`, href: `https://instagram.com/${s.instagram}` },
              { icon: MapPin, label: 'Delivery', value: 'Nationwide across Egypt 🇪🇬', href: undefined },
            ].map((c, i) => (
              <a key={i} href={c.href} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl border border-navy-50 bg-white p-5 shadow-card transition hover:shadow-lift">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy-50 text-navy"><c.icon size={20} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slatey">{c.label}</p>
                  <p className="font-semibold text-navy-900">{c.value}</p>
                </div>
              </a>
            ))}
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-navy-50 bg-white p-6 shadow-card">
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-green-50 text-green-600"><Send size={26} /></div>
                <h3 className="mt-4 font-head text-xl font-bold text-navy-900">Message sent!</h3>
                <p className="mt-2 text-navy-600">Thanks for reaching out. We'll get back to you shortly.</p>
              </div>
            ) : (
              <>
                <h2 className="font-head text-lg font-bold text-navy-900">Send us a message</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">Name</label>
                    <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Email</label>
                      <input className="input" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Subject</label>
                    <input className="input" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Order question, bulk gift, etc." />
                  </div>
                  <div>
                    <label className="label">Message</label>
                    <textarea className="input min-h-[120px]" required value={form.message} onChange={(e) => set('message', e.target.value)} />
                  </div>
                  {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
                  <button disabled={sending} className="btn-primary w-full py-3.5">
                    {sending ? <><Loader2 className="animate-spin" size={16} /> Sending…</> : <>Send message <Send size={16} /></>}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
