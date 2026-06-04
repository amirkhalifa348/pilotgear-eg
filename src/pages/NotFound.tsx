import { Link } from 'react-router-dom'
import { Plane } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container-px flex flex-col items-center py-28 text-center">
      <Plane size={48} className="text-gold" />
      <h1 className="mt-6 font-head text-5xl font-extrabold text-navy-900">404</h1>
      <p className="mt-3 text-lg text-navy-600">This page has flown off the radar.</p>
      <Link to="/" className="btn-primary mt-8">Back to home</Link>
    </div>
  )
}
