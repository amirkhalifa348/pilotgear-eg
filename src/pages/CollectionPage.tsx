import { Link, useParams } from 'react-router-dom'
import { useStore } from '../data/store'
import ProductCard from '../components/storefront/ProductCard'
import NotFound from './NotFound'

export default function CollectionPage() {
  const { slug } = useParams()
  const collections = useStore((d) => d.collections)
  const products = useStore((d) => d.products)
  const col = collections.find((c) => c.slug === slug)
  if (!col) return <NotFound />
  const list = products.filter((p) => p.active && p.collectionId === col.id)

  return (
    <div>
      <div className="relative overflow-hidden border-b border-navy-50 bg-navy text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="container-px relative py-14">
          <nav className="text-xs font-medium text-white/60">
            <Link to="/" className="hover:text-white">Home</Link> / <Link to="/shop" className="hover:text-white">Shop</Link> / <span className="text-white">{col.title}</span>
          </nav>
          <h1 className="mt-3 font-head text-3xl font-extrabold sm:text-4xl">{col.title}</h1>
          <p className="mt-3 max-w-xl text-white/75">{col.description}</p>
        </div>
      </div>
      <div className="container-px py-10">
        <p className="mb-5 text-sm text-slatey">{list.length} products</p>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  )
}
