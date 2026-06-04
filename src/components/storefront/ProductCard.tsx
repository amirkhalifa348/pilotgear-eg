import { Link, useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import type { Product } from '../../data/types'
import { formatMoney } from '../../data/store'
import AddToCartButton from '../ui/AddToCartButton'

export default function ProductCard({ product }: { product: Product }) {
  const discount = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0
  const out = product.stock <= 0
  const hasVariants = !!product.variants?.length
  const nav = useNavigate()
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-navy-50 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-paper">
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {discount > 0 && <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-navy-deep">-{discount}%</span>}
          {product.tags.includes('best seller') && <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-bold text-white">Best seller</span>}
          {out && <span className="rounded-full bg-navy-200 px-2.5 py-1 text-[11px] font-bold text-navy-deep">Sold out</span>}
        </div>
        <img
          src={product.images[0]}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 sm:p-6"
        />
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:p-6"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/product/${product.slug}`} className="line-clamp-1 font-head text-base font-semibold text-navy-900 hover:text-navy-600">
          {product.title}
        </Link>
        <p className="line-clamp-1 text-sm text-slatey">{product.subtitle}</p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-head text-lg font-bold text-navy">{formatMoney(product.price)}</span>
          {product.compareAtPrice && <span className="text-sm text-slatey line-through">{formatMoney(product.compareAtPrice)}</span>}
        </div>
        {hasVariants ? (
          <button
            onClick={() => nav(`/product/${product.slug}`)}
            disabled={out}
            className="btn-gold mt-3 w-full py-2.5 text-[13px] disabled:bg-navy-100 disabled:text-slatey"
          >
            <SlidersHorizontal size={15} /> {out ? 'Sold out' : 'Choose options'}
          </button>
        ) : (
          <AddToCartButton productId={product.id} disabled={out} size="sm" className="mt-3" />
        )}
      </div>
    </div>
  )
}
