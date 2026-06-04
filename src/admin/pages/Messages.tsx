import { useEffect, useState } from 'react'
import { Mail, MailOpen, Phone, Reply, Search, Trash2, X } from 'lucide-react'
import { supabase } from '../../data/supabase'
import type { ContactMessage } from '../../data/types'
import { PageHeader } from '../ui'

export default function Messages() {
  const [list, setList] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'replied'>('all')
  const [open, setOpen] = useState<ContactMessage | null>(null)

  async function fetchAll() {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) console.warn(error)
    setList((data as ContactMessage[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const ch = supabase
      .channel('messages-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchAll())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = list.filter((m) => {
    if (filter === 'unread' && m.is_read) return false
    if (filter === 'replied' && !m.replied) return false
    if (q) {
      const s = (m.name + m.email + (m.subject ?? '') + m.message).toLowerCase()
      if (!s.includes(q.toLowerCase())) return false
    }
    return true
  })

  const unreadCount = list.filter((m) => !m.is_read).length

  async function markRead(m: ContactMessage, read: boolean) {
    setList((l) => l.map((x) => x.id === m.id ? { ...x, is_read: read } : x))
    if (open?.id === m.id) setOpen({ ...m, is_read: read })
    await supabase.from('messages').update({ is_read: read }).eq('id', m.id)
  }
  async function markReplied(m: ContactMessage) {
    setList((l) => l.map((x) => x.id === m.id ? { ...x, replied: true, is_read: true } : x))
    if (open?.id === m.id) setOpen({ ...m, replied: true, is_read: true })
    await supabase.from('messages').update({ replied: true, is_read: true }).eq('id', m.id)
  }
  async function remove(m: ContactMessage) {
    if (!confirm(`Delete message from ${m.name}?`)) return
    setList((l) => l.filter((x) => x.id !== m.id))
    if (open?.id === m.id) setOpen(null)
    await supabase.from('messages').delete().eq('id', m.id)
  }

  function dateLabel(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function openMessage(m: ContactMessage) {
    setOpen(m)
    if (!m.is_read) markRead(m, true)
  }

  return (
    <div>
      <PageHeader title="Messages" subtitle={`${list.length} total · ${unreadCount} unread`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'unread', 'replied'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition ${filter === f ? 'bg-navy text-white' : 'bg-white text-navy-600 shadow-card hover:bg-navy-50'}`}>
            {f}
          </button>
        ))}
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slatey" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" className="input pl-9" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-50 bg-white shadow-card">
        {loading ? (
          <p className="py-12 text-center text-sm text-slatey">Loading messages…</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-slatey">No messages yet.</p>
        ) : (
          <div className="divide-y divide-navy-50">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => openMessage(m)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-navy-50 ${!m.is_read ? 'bg-gold-50/40' : ''}`}
              >
                <span className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full ${!m.is_read ? 'bg-gold text-navy-deep' : 'bg-navy-50 text-navy-600'}`}>
                  {m.is_read ? <MailOpen size={16} /> : <Mail size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate ${!m.is_read ? 'font-bold text-navy-900' : 'font-semibold text-navy-700'}`}>{m.name}</p>
                    <span className="shrink-0 text-xs text-slatey">{dateLabel(m.created_at)}</span>
                  </div>
                  <p className="truncate text-sm text-navy-600">{m.subject || m.message.slice(0, 80)}</p>
                  <p className="mt-0.5 truncate text-xs text-slatey">{m.email}</p>
                </div>
                {m.replied && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">Replied</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setOpen(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-lift animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slatey">{dateLabel(open.created_at)}</p>
                <h2 className="mt-1 font-head text-xl font-extrabold text-navy-900">{open.name}</h2>
              </div>
              <button onClick={() => setOpen(null)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy-50"><X /></button>
            </div>

            <div className="mt-4 space-y-1.5 text-sm">
              <a href={`mailto:${open.email}`} className="flex items-center gap-2 font-semibold text-navy hover:text-gold-600"><Mail size={14} /> {open.email}</a>
              {open.phone && <a href={`tel:${open.phone}`} className="flex items-center gap-2 font-semibold text-navy hover:text-gold-600"><Phone size={14} /> {open.phone}</a>}
            </div>

            {open.subject && (
              <div className="mt-5 rounded-xl bg-paper p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slatey">Subject</p>
                <p className="mt-1 font-semibold text-navy-900">{open.subject}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl bg-paper p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-700">{open.message}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={replyHref(open)}
                onClick={() => markReplied(open)}
                className="btn-primary flex-1"
              ><Reply size={16} /> Reply by email</a>
              <button
                onClick={() => markRead(open, !open.is_read)}
                className="btn-outline"
              >
                {open.is_read ? 'Mark unread' : 'Mark read'}
              </button>
              <button onClick={() => remove(open)} className="btn text-red-600 hover:bg-red-50"><Trash2 size={16} /> Delete</button>
            </div>

            {open.replied && (
              <p className="mt-4 text-center text-xs font-semibold text-green-600">✓ Marked as replied</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function replyHref(m: ContactMessage) {
  const subject = encodeURIComponent(`Re: ${m.subject || 'Your message to PilotGear EG'}`)
  const body = encodeURIComponent(`Hi ${m.name},\n\n\n\n---\nYou wrote:\n${m.message}`)
  return `mailto:${m.email}?subject=${subject}&body=${body}`
}
