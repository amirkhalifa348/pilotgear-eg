import { useState } from 'react'
import { Instagram, Mail, MapPin, Send } from 'lucide-react'
import { useStore } from '../data/store'

export default function Contact() {
  const s = useStore((d) => d.settings)
  const [sent, setSent] = useState(false)
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

          <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="rounded-2xl border border-navy-50 bg-white p-6 shadow-card">
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
                  <div><label className="label">Name</label><input className="input" required /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="label">Email</label><input className="input" type="email" required /></div>
                    <div><label className="label">Phone</label><input className="input" /></div>
                  </div>
                  <div><label className="label">Message</label><textarea className="input min-h-[120px]" required /></div>
                  <button className="btn-primary w-full py-3.5">Send message <Send size={16} /></button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
