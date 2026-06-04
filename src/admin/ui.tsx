import { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-navy-900">{title}</h1>
        {subtitle && <p className="text-sm text-slatey">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Toast({ show, message }: { show: boolean; message: string }) {
  if (!show) return null
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-lift">
      {message}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-gold-50 text-gold-700',
    confirmed: 'bg-navy-50 text-navy',
    shipped: 'bg-blue-50 text-blue-700',
    delivered: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-600',
    active: 'bg-green-50 text-green-700',
    draft: 'bg-navy-50 text-navy-600',
  }
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${map[status] || 'bg-navy-50 text-navy-600'}`}>{status}</span>
}
