import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gift, Plane, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import type { PageBlock, Product, Collection } from '../../data/types'
import { formatMoney, useStore } from '../../data/store'
import ProductCard from './ProductCard'

const iconMap: Record<string, any> = { truck: Truck, shield: ShieldCheck, gift: Gift, plane: Plane }

function Hero({ p }: { p: any }) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-navy-400/30 blur-3xl" />
      <div className="container-px relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div className="animate-fade-up">
          <span className="chip bg-white/10 text-gold"><Sparkles size={14} /> {p.eyebrow}</span>
          <h1 className="mt-5 font-head text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
            {p.title}
          </h1>
          <p className="mt-5 max-w-md text-base text-white/75 sm:text-lg">{p.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="btn-gold text-base">{p.ctaPrimary} <ArrowRight size={18} /></Link>
            <Link to="/shop" className="btn border border-white/25 text-white hover:bg-white hover:text-navy">{p.ctaSecondary}</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-white/70">
            <span className="flex items-center gap-2"><Truck size={16} className="text-gold" /> Cash on delivery</span>
            <span className="flex items-center gap-2"><Plane size={16} className="text-gold" /> Shipping across Egypt</span>
          </div>
        </div>
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-gradient-to-br from-gold/40 to-transparent blur-2xl sm:h-96 sm:w-96" />
          <img src={p.image} alt="" className="relative mx-auto max-h-[420px] w-auto animate-float drop-shadow-2xl" />
        </div>
      </div>
    </section>
  )
}

function Marquee({ p }: { p: any }) {
  const items: string[] = p.items || []
  const row = [...items, ...items]
  return (
    <div className="border-y border-navy-50 bg-cream py-3.5">
      <div className="relative flex overflow-hidden">
        <div className="flex shrink-0 animate-marquee items-center gap-10 pr-10">
          {row.map((t, i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap text-sm font-semibold text-navy-600">
              <Plane size={15} className="text-gold" /> {t}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 animate-marquee items-center gap-10 pr-10" aria-hidden>
          {row.map((t, i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap text-sm font-semibold text-navy-600">
              <Plane size={15} className="text-gold" /> {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ValueProps({ p }: { p: any }) {
  return (
    <section className="container-px py-14">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(p.items || []).map((it: any, i: number) => {
          const Icon = iconMap[it.icon] || Sparkles
          return (
            <div key={i} className="rounded-2xl border border-navy-50 bg-white p-5 shadow-card transition hover:shadow-lift">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy-50 text-navy"><Icon size={20} /></div>
              <h3 className="mt-4 font-head text-base font-bold text-navy-900">{it.title}</h3>
              <p className="mt-1 text-sm text-slatey">{it.text}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {subtitle && <p className="text-sm font-bold uppercase tracking-wider text-gold-500">{subtitle}</p>}
        <h2 className="mt-1 font-head text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h2>
      </div>
      {href && <Link to={href} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-navy-600 hover:text-navy sm:inline-flex">View all <ArrowRight size={16} /></Link>}
    </div>
  )
}

function Collections({ p, collections }: { p: any; collections: Collection[] }) {
  return (
    <section className="container-px py-14">
      <SectionHeader title={p.title} subtitle={p.subtitle} href="/shop" />
      <div className="grid gap-5 md:grid-cols-3">
        {collections.map((c) => (
          <Link key={c.id} to={`/collections/${c.slug}`} className="group relative overflow-hidden rounded-2xl bg-navy shadow-card">
            <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-navy-600 to-navy-deep">
              <img src={c.image} alt={c.title} className="h-full w-full object-contain p-8 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-deep via-navy-deep/70 to-transparent p-5 pt-12">
              <h3 className="font-head text-xl font-bold text-white">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-white/70">{c.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold">Shop now <ArrowRight size={15} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Featured({ p, products }: { p: any; products: Product[] }) {
  const list = products.filter((x) => x.featured && x.active).slice(0, 8)
  return (
    <section className="container-px py-14">
      <SectionHeader title={p.title} subtitle={p.subtitle} href="/shop" />
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {list.map((pr) => <ProductCard key={pr.id} product={pr} />)}
      </div>
    </section>
  )
}

function Banner({ p }: { p: any }) {
  return (
    <section className="container-px py-14">
      <div className="grid overflow-hidden rounded-3xl bg-navy text-white lg:grid-cols-2">
        <div className="relative flex flex-col justify-center p-8 sm:p-12">
          <span className="text-sm font-bold uppercase tracking-wider text-gold">{p.eyebrow}</span>
          <h2 className="mt-3 font-head text-3xl font-extrabold sm:text-4xl">{p.title}</h2>
          <p className="mt-4 max-w-sm text-white/75">{p.text}</p>
          <Link to={p.href} className="btn-gold mt-7 w-fit">{p.cta} <ArrowRight size={18} /></Link>
        </div>
        <div className="relative flex items-center justify-center bg-gradient-to-br from-navy-600 to-navy-deep p-8">
          <div className="absolute h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
          <img src={p.image} alt={p.title} className="relative max-h-80 w-auto animate-float drop-shadow-2xl" />
        </div>
      </div>
    </section>
  )
}

function GiftCta({ p }: { p: any }) {
  return (
    <section className="container-px py-14">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gold-100 to-cream p-8 text-center sm:p-14">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold text-navy-deep"><Gift size={26} /></div>
        <h2 className="mx-auto mt-5 max-w-2xl font-head text-3xl font-extrabold text-navy-900 sm:text-4xl">{p.title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-navy-600">{p.text}</p>
        <Link to={p.href} className="btn-primary mt-7">{p.cta} <ArrowRight size={18} /></Link>
      </div>
    </section>
  )
}

function Testimonials({ p }: { p: any }) {
  return (
    <section className="bg-paper py-16">
      <div className="container-px">
        <h2 className="text-center font-head text-2xl font-extrabold text-navy-900 sm:text-3xl">{p.title}</h2>
        <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
          {(p.items || []).map((t: any, i: number) => (
            <div key={i} className="rounded-2xl border border-navy-50 bg-white p-6 shadow-card">
              <p className="text-base leading-relaxed text-navy-700">“{t.text}”</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-navy text-sm font-bold text-white">{t.name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold text-navy-900">{t.name}</p>
                  <p className="text-xs text-slatey">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Newsletter({ p }: { p: any }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <section className="container-px py-16">
      <div className="overflow-hidden rounded-3xl bg-navy px-6 py-12 text-center text-white sm:px-12">
        <h2 className="font-head text-2xl font-extrabold sm:text-3xl">{p.title}</h2>
        <p className="mx-auto mt-3 max-w-md text-white/70">{p.text}</p>
        {done ? (
          <p className="mt-6 inline-block rounded-full bg-gold px-6 py-3 font-semibold text-navy-deep">You're on the list! ✈️</p>
        ) : (
          <form className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (email) setDone(true) }}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="input flex-1 border-transparent bg-white/10 text-white placeholder:text-white/50" />
            <button className="btn-gold whitespace-nowrap">Join the crew</button>
          </form>
        )}
      </div>
    </section>
  )
}

export function BlockRenderer({ block }: { block: PageBlock }) {
  const products = useStore((d) => d.products)
  const collections = useStore((d) => d.collections)
  if (!block.enabled) return null
  switch (block.type) {
    case 'hero': return <Hero p={block.props} />
    case 'marquee': return <Marquee p={block.props} />
    case 'valueProps': return <ValueProps p={block.props} />
    case 'collections': return <Collections p={block.props} collections={collections} />
    case 'featured':
    case 'bestsellers': return <Featured p={block.props} products={products} />
    case 'banner': return <Banner p={block.props} />
    case 'giftCta': return <GiftCta p={block.props} />
    case 'testimonials': return <Testimonials p={block.props} />
    case 'newsletter': return <Newsletter p={block.props} />
    default: return null
  }
}

export const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero banner',
  marquee: 'Scrolling marquee',
  valueProps: 'Value props (icons)',
  collections: 'Collections grid',
  featured: 'Featured products',
  bestsellers: 'Best sellers',
  banner: 'Promo banner',
  giftCta: 'Gift call-to-action',
  testimonials: 'Testimonials',
  newsletter: 'Newsletter signup',
}

export const formatMoneyExport = formatMoney
