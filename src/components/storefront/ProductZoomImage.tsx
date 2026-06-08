import { useRef, useState } from 'react'
import { ZoomIn } from 'lucide-react'

interface Props {
  src: string
  alt: string
  /** Optional badge (e.g. discount) rendered top-left. */
  badge?: React.ReactNode
  /** Zoom magnification. */
  scale?: number
}

/**
 * Product gallery image with magnifier zoom. On desktop, hover to zoom into the spot
 * under the cursor; on touch, tap to zoom and drag to pan. Lets shoppers inspect detail
 * (e.g. embroidery / stitching) without leaving the page.
 */
export default function ProductZoomImage({ src, alt, badge, scale = 2.3 }: Props) {
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const isTouch = useRef(false)
  const ref = useRef<HTMLDivElement>(null)

  function originFrom(clientX: number, clientY: number) {
    const r = ref.current!.getBoundingClientRect()
    const x = clamp(((clientX - r.left) / r.width) * 100, 0, 100)
    const y = clamp(((clientY - r.top) / r.height) * 100, 0, 100)
    setOrigin({ x, y })
  }

  function onPointerEnter(e: React.PointerEvent) {
    isTouch.current = e.pointerType === 'touch'
    if (!isTouch.current) { originFrom(e.clientX, e.clientY); setZoomed(true) }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === 'touch') {
      if (zoomed) originFrom(e.clientX, e.clientY) // pan while zoomed
      return
    }
    // mouse: follow cursor and keep zoomed (covers cases where pointerenter is missed)
    originFrom(e.clientX, e.clientY)
    if (!zoomed) setZoomed(true)
  }
  function onPointerLeave(e: React.PointerEvent) {
    if (e.pointerType !== 'touch') setZoomed(false)
  }
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') {
      originFrom(e.clientX, e.clientY)
      setZoomed((z) => !z)
    }
  }

  return (
    <div
      ref={ref}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-3xl border border-navy-50 bg-paper"
      style={{ touchAction: zoomed ? 'none' : 'auto' }}
    >
      {badge}

      {/* Zoom affordance */}
      <span
        className={`pointer-events-none absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-navy shadow-card backdrop-blur transition ${
          zoomed ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <ZoomIn size={16} />
      </span>

      <img
        src={src}
        alt={alt}
        draggable={false}
        className="h-full w-full select-none object-contain p-8 transition-transform duration-200 ease-out"
        style={{
          transform: zoomed ? `scale(${scale})` : 'scale(1)',
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
      />
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
