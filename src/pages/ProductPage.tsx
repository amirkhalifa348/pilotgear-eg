import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, Gift, Minus, Plus, ShieldCheck, Truck } from 'lucide-react'
import { formatMoney, track, useStore } from '../data/store'
import { pixel } from '../lib/pixel'
import QtyStepper from '../components/ui/QtyStepper'
import AddToCartButton from '../components/ui/AddToCartButton'
import ProductCard from '../components/storefront/ProductCard'
import ProductZoomImage from '../components/storefront/ProductZoomImage'
import NotFound from './NotFound'

export default function ProductPage() {
  const { slug } = useParams()
  const products = useStore((d) => d.products)
  const product = products.find((p) => p.slug === slug)
  const collections = useStore((d) => d.collections)
  const nav = useNavigate()
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [variantId, setVariantId] = useState<string | undefined>(undefined)
  const [openSpec, setOpenSpec] = useState(true)

  useEffect(() => {
    setActiveImg(0); setQty(1)
    setVariantId(product?.variants?.[0]?.id)
    if (product) {
      track({ type: 'product_view', productId: product.id })
      pixel('ViewContent', { content_ids: [product.id], content_name: product.title, value: product.price, currency: 'EGP', content_type: 'product' })
    }
  }, [product?.id])

  if (!product) return <NotFound />
  const discount = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0
  const out = product.stock <= 0
  const related = products.filter((p) => p.active && p.collectionId === product.collectionId && p.id !== product.id).slice(0, 4)
  const collection = collections.find((c) => c.id === product.collectionId)

  function pickVariant(id: string, image?: string) {
    setVariantId(id)
    if (image) {
      const idx = product!.images.indexOf(image)
      if (idx >= 0) setActiveImg(idx)
    }
  }

  return (
    <div>
      <div className="container-px pt-6">
        <nav className="flex items-center gap-1 text-xs font-medium text-slatey">
          <Link to="/" className="hover:text-navy">Home</Link> <ChevronRight size={12} />
          <Link to="/shop" className="hover:text-navy">Shop</Link> <ChevronRight size={12} />
          {collection && <><Link to={`/collections/${collection.slug}`} className="hover:text-navy">{collection.title}</Link> <ChevronRight size={12} /></>}
          <span className="text-navy-600">{product.title}</span>
        </nav>
      </div>

      <div className="container-px grid gap-10 py-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductZoomImage
            key={activeImg}
            src={product.images[activeImg]}
            alt={product.title}
            badge={discount > 0 ? <span className="absolute left-4 top-4 z-10 rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy-deep">Save {discount}%</span> : null}
          />
          {product.images.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {product.images.map((image, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square w-20 overflow-hidden rounded-xl border-2 bg-paper transition ${i === activeImg ? 'border-gold' : 'border-navy-50 hover:border-navy-200'}`}>
                  <img src={image} alt="" className="h-full w-full object-contain p-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.tags.includes('best seller') && <span className="chip bg-gold-50 text-gold-600">🔥 Best seller</span>}
          <h1 className="mt-3 font-head text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">{product.title}</h1>
          <p className="mt-2 text-lg text-slatey">{product.subtitle}</p>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-head text-3xl font-extrabold text-navy">{formatMoney(product.price)}</span>
            {product.compareAtPrice && <span className="text-lg text-slatey line-through">{formatMoney(product.compareAtPrice)}</span>}
            {discount > 0 && <span className="rounded-full bg-gold-50 px-2.5 py-1 text-xs font-bold text-gold-600">-{discount}%</span>}
          </div>

          <p className="mt-5 leading-relaxed text-navy-700">{product.description}</p>

          {/* Variants */}
          {product.variants?.length ? (
            <div className="mt-6">
              <p className="label">Colour: <span className="text-navy-900">{product.variants.find((v) => v.id === variantId)?.name}</span></p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => pickVariant(v.id, v.image)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${variantId === v.id ? 'border-navy bg-navy text-white' : 'border-navy-100 text-navy-700 hover:border-navy-300'}`}
                  >{v.name}</button>
                ))}
              </div>
            </div>
          ) : null}

          <ul className="mt-6 space-y-2.5">
            {product.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-navy-700">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-50 text-gold-600"><Check size={13} /></span>
                {h}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex items-center gap-2 text-sm">
            {out ? <span className="font-semibold text-red-600">Currently sold out</span>
              : product.stock <= product.lowStockThreshold
                ? <span className="font-semibold text-gold-600">⚡ Only {product.stock} left in stock</span>
                : <span className="font-semibold text-green-600">✓ In stock & ready to ship</span>}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} max={Math.max(1, product.stock)} />
            <div className="flex-1 min-w-[160px]">
              <AddToCartButton productId={product.id} variantId={variantId} qty={qty} disabled={out} size="lg" />
            </div>
          </div>
          <button
            onClick={() => { if (!out) { nav('/checkout') } }}
            disabled={out}
            className="btn-gold mt-3 w-full py-3.5 text-base disabled:opacity-50"
          >
            Buy it now
          </button>

          {/* trust */}
          <div className="mt-7 grid grid-cols-3 gap-3 rounded-2xl border border-navy-50 bg-paper p-4 text-center">
            {[{ i: Truck, t: 'Cash on delivery' }, { i: ShieldCheck, t: 'Premium quality' }, { i: Gift, t: 'Great gift idea' }].map((x, n) => (
              <div key={n} className="flex flex-col items-center gap-1.5">
                <x.i size={20} className="text-navy" />
                <span className="text-xs font-semibold text-navy-600">{x.t}</span>
              </div>
            ))}
          </div>

          {/* specs accordion */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-navy-50">
            <button onClick={() => setOpenSpec((v) => !v)} className="flex w-full items-center justify-between bg-paper px-5 py-4 text-left font-head font-bold text-navy-900">
              Specifications {openSpec ? <Minus size={18} /> : <Plus size={18} />}
            </button>
            {openSpec && (
              <dl className="divide-y divide-navy-50">
                {product.specs.map((s, i) => (
                  <div key={i} className="flex justify-between px-5 py-3 text-sm">
                    <dt className="font-semibold text-navy-600">{s.label}</dt>
                    <dd className="text-navy-900">{s.value}</dd>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-3 text-sm">
                  <dt className="font-semibold text-navy-600">SKU</dt>
                  <dd className="text-navy-900">{product.sku}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="container-px py-12">
          <h2 className="mb-7 font-head text-2xl font-extrabold text-navy-900">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
