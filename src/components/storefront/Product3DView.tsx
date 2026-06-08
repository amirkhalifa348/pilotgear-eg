import { useEffect, useRef, useState } from 'react'
import { Box, RotateCcw, X } from 'lucide-react'

interface Props {
  src: string
  alt: string
  /** Optional badge (e.g. discount) rendered top-left, matching the static gallery. */
  badge?: React.ReactNode
}

const MAX_Y = 32 // max left/right rotation in degrees
const MAX_X = 16 // max up/down tilt in degrees

/**
 * Interactive "3D" product viewer. Drag (mouse or touch) left/right to rotate the
 * product photo around the Y axis, up/down to tilt around X, with depth, parallax
 * shadow and a light glare that tracks the rotation — the premium feel pro brands use.
 * Works with a single flat product photo (no 3D model or frame sequence required).
 */
export default function Product3DView({ src, alt, badge }: Props) {
  const [active, setActive] = useState(false)
  const [rot, setRot] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [hinted, setHinted] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const start = useRef({ px: 0, py: 0, rx: 0, ry: 0 })

  // Gentle auto-rotate hint the first time the user enters 3D mode.
  useEffect(() => {
    if (!active || hinted) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const e = t - t0
      if (e > 1200) { setRot({ x: 0, y: 0 }); setHinted(true); return }
      setRot({ x: 0, y: Math.sin(e / 190) * 18 * (1 - e / 1200) })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, hinted])

  function pointFrom(e: PointerEvent | React.PointerEvent) {
    return { px: e.clientX, py: e.clientY }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!active) return
    setHinted(true)
    setDragging(true)
    const p = pointFrom(e)
    start.current = { px: p.px, py: p.py, rx: rot.x, ry: rot.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const w = frameRef.current?.clientWidth || 400
    const h = frameRef.current?.clientHeight || 400
    const dx = (e.clientX - start.current.px) / w
    const dy = (e.clientY - start.current.py) / h
    const y = clamp(start.current.ry + dx * MAX_Y * 2.4, -MAX_Y, MAX_Y)
    const x = clamp(start.current.rx - dy * MAX_X * 2.4, -MAX_X, MAX_X)
    setRot({ x, y })
  }

  function endDrag() { setDragging(false) }
  function reset() { setHinted(true); setRot({ x: 0, y: 0 }) }

  // Glare position follows the rotation so the surface looks lit.
  const glareX = 50 + (rot.y / MAX_Y) * 45
  const glareY = 50 - (rot.x / MAX_X) * 45

  return (
    <div className="relative">
      <div
        ref={frameRef}
        className="relative aspect-square overflow-hidden rounded-3xl border border-navy-50 bg-paper"
        style={{ perspective: '1100px', touchAction: active ? 'none' : 'auto' }}
      >
        {badge}

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className={`absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-card transition ${
            active ? 'bg-navy text-white' : 'bg-white/90 text-navy backdrop-blur hover:bg-white'
          }`}
          aria-pressed={active}
        >
          {active ? <X size={14} /> : <Box size={14} />}
          {active ? 'Exit 3D' : 'View in 3D'}
        </button>

        {/* Reset, only in 3D mode and when rotated */}
        {active && (rot.x !== 0 || rot.y !== 0) && (
          <button
            type="button"
            onClick={reset}
            className="absolute left-4 bottom-4 z-20 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-navy shadow-card backdrop-blur transition hover:bg-white"
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}

        {/* The product, in a rotating 3D layer */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          className="absolute inset-0 grid place-items-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
            transition: dragging ? 'none' : 'transform 420ms cubic-bezier(.22,1,.36,1)',
            cursor: active ? (dragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          {/* contact shadow that shifts opposite to rotation for grounding */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[12%] h-[10%] w-[55%] rounded-[50%] bg-navy-900/25 blur-xl"
            style={{
              transform: `translateX(${(-rot.y / MAX_Y) * 14}%) scaleX(${1 - Math.abs(rot.y) / MAX_Y * 0.25})`,
              opacity: active ? 0.55 : 0,
              transition: dragging ? 'none' : 'all 420ms cubic-bezier(.22,1,.36,1)',
            }}
          />
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="relative h-full w-full select-none object-contain p-8"
            style={{ transform: 'translateZ(40px)' }}
          />
          {/* glare overlay */}
          {active && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,.45), rgba(255,255,255,0) 55%)`,
                mixBlendMode: 'soft-light',
                transform: 'translateZ(60px)',
              }}
            />
          )}
        </div>

        {/* Drag hint */}
        {active && !hinted && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
            <span className="animate-pulse rounded-full bg-navy/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              ← Drag to rotate →
            </span>
          </div>
        )}
      </div>

      {active && (
        <p className="mt-2 text-center text-xs text-slatey">Drag the product left and right to view it in 3D</p>
      )}
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
