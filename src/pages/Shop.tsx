import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useStore } from '../data/store'
import ProductCard from '../components/storefront/ProductCard'

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest'

export default function Shop() {
  const products = useStore((d) => d.products)
  const collections = useStore((d) => d.collections)
  const [params, setParams] = useSearchParams()
  const active = params.get('collection') || 'all'
  const [sort, setSort] = useState<Sort>('featured')

  const list = useMemo(() => {
    let l = products.filter((p) => p.active)
    if (active !== 'all') l = l.filter((p) => p.collectionId === active)
    switch (sort) {
      case 'price-asc': l = [...l].sort((a, b) => a.price - b.price); break
      case 'price-desc': l = [...l].sort((a, b) => b.price - a.price); break
      case 'rating': l = [...l].sort((a, b) => b.rating - a.rating); break
      case 'newest': l = [...l].sort((a, b) => b.createdAt - a.createdAt); break
      default: l = [...l].sort((a, b) => Number(b.featured) - Number(a.featured))
    }
    return l
  }, [products, active, sort])

  return (
    <div>
      <div className="border-b border-navy-50 bg-paper">
        <div className="container-px py-10 sm:py-12">
          <nav className="text-xs font-medium text-slatey">
            <Link to="/" className="hover:text-navy">Home</Link> / <span className="text-navy-600">Shop</span>
          </nav>
          <h1 className="mt-2 font-head text-3xl font-extrabold text-navy-900 sm:text-4xl">Shop all gear</h1>
          <p className="mt-2 max-w-xl text-navy-600">Aviation keychains, accessories & gifts, built for everyone who loves the sky.</p>
        </div>
      </div>

      <div className="container-px py-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setParams({})}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active === 'all' ? 'bg-navy text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
            >All</button>
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => setParams({ collection: c.id })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active === c.id ? 'bg-navy text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
              >{c.title}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-600">
            <SlidersHorizontal size={16} />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-navy-100 bg-white px-3 py-2 text-sm font-semibold text-navy focus:outline-none">
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top rated</option>
            </select>
          </label>
        </div>

        <p className="mb-5 text-sm text-slatey">{list.length} products</p>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {list.length === 0 && <p className="py-20 text-center text-slatey">No products found in this collection.</p>}
      </div>
    </div>
  )
}
