import { useStore } from '../data/store'
import { BlockRenderer } from '../components/storefront/blocks'

export default function Home() {
  const blocks = useStore((d) => d.homepage)
  return (
    <div>
      {blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}
    </div>
  )
}
