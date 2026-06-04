import { Link } from 'react-router-dom'
import { ArrowRight, Heart, Plane, Sparkles, Target } from 'lucide-react'

export default function About() {
  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
        <div className="container-px relative py-16 sm:py-20">
          <span className="chip bg-white/10 text-gold"><Plane size={14} /> Our story</span>
          <h1 className="mt-5 max-w-2xl font-head text-4xl font-extrabold leading-tight sm:text-5xl">Bringing aviation passion home to Egypt.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">PilotGear EG was founded on one simple idea: the love of flight deserves to be worn, carried and shared. We make it easy for everyone who loves aviation across Egypt to show their passion.</p>
        </div>
      </section>

      <section className="container-px py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Target, title: 'Our mission', text: 'To bring aviation passion into Egypt and give every pilot and aspiring pilot a way to show what they love.' },
            { icon: Heart, title: 'Made with passion', text: 'Every piece is chosen for people who love aviation, from curious beginners to lifelong enthusiasts.' },
            { icon: Sparkles, title: 'Quality first', text: 'Premium materials and durable finishes. Gear built to last as long as your passion for flight.' },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl border border-navy-50 bg-white p-6 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-navy-50 text-navy"><c.icon size={22} /></div>
              <h3 className="mt-4 font-head text-lg font-bold text-navy-900">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-px pb-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-navy-deep p-10 text-center text-white sm:p-16">
          <h2 className="font-head text-3xl font-extrabold sm:text-4xl">Whether you fly them or dream of them</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/75">we've got the gear to keep your passion close. Explore the collection and find your favourite.</p>
          <Link to="/shop" className="btn-gold mt-8">Shop the collection <ArrowRight size={18} /></Link>
        </div>
      </section>
    </div>
  )
}
