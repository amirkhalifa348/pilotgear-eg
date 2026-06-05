import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Plane } from 'lucide-react'
import { adminLogin } from '../data/store'

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  return (
    <div className="grid min-h-screen place-items-center bg-navy p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/brand/logo-white.png" alt="PilotGear EG" className="h-12" onError={(e) => ((e.target as HTMLImageElement).src = '/brand/logo.png')} />
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/70"><Lock size={15} /> Admin Dashboard</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (adminLogin(pw)) onSuccess(); else setErr(true) }}
          className="rounded-2xl bg-white p-7 shadow-lift"
        >
          <label className="label">Password</label>
          <input
            type="password"
            autoFocus
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(false) }}
            className="input"
            placeholder="Enter admin password"
          />
          {err && <p className="mt-2 text-sm text-red-500">Incorrect password. Try again.</p>}
          <button className="btn-primary mt-5 w-full py-3">Sign in</button>
        </form>
        <Link to="/" className="mt-5 block text-center text-sm font-medium text-white/60 hover:text-gold"><Plane size={13} className="mr-1 inline" /> Back to store</Link>
      </div>
    </div>
  )
}
