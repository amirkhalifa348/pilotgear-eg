import { useRef, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { addToCart } from '../../data/store'

interface Props {
  productId: string
  variantId?: string
  qty?: number
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

type State = 'idle' | 'adding' | 'added'

export default function AddToCartButton({
  productId, variantId, qty = 1, disabled = false,
  className = '', size = 'md', label = 'Add to cart',
}: Props) {
  const [state, setState] = useState<State>('idle')
  const [particles, setParticles] = useState<number[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pidRef = useRef(0)

  function handleClick() {
    if (disabled || state !== 'idle') return
    addToCart(productId, qty, variantId)

    // Spawn a floating particle
    const id = ++pidRef.current
    setParticles((p) => [...p, id])
    setTimeout(() => setParticles((p) => p.filter((x) => x !== id)), 700)

    setState('adding')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setState('added')
      timerRef.current = setTimeout(() => setState('idle'), 1600)
    }, 160)
  }

  const sizeMap = {
    sm: 'py-2.5 text-[13px]',
    md: 'py-3 text-sm',
    lg: 'py-3.5 text-base',
  }

  const baseClass = `relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${sizeMap[size]} ${className}`

  const stateClass =
    state === 'added'
      ? 'bg-green-500 text-white scale-[1.02] shadow-lift animate-btn-success'
      : state === 'adding'
      ? 'bg-gold text-navy-deep scale-95'
      : 'bg-gold text-navy-deep hover:bg-gold-400 shadow-card hover:shadow-lift'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClass} ${stateClass} disabled:bg-navy-100 disabled:text-slatey disabled:pointer-events-none`}
    >
      {/* Floating particles */}
      {particles.map((id) => (
        <span
          key={id}
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center animate-fly-up"
        >
          <ShoppingBag size={16} className="text-white drop-shadow" />
        </span>
      ))}

      {/* Icon */}
      <span className={`transition-all duration-200 ${state === 'adding' ? 'scale-75 opacity-50' : 'scale-100 opacity-100'}`}>
        {state === 'added' ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="stroke-white">
            <polyline
              points="3,9 7,13 15,5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="30"
              strokeDashoffset="0"
              className="animate-check-draw"
            />
          </svg>
        ) : (
          <ShoppingBag size={size === 'lg' ? 18 : 16} />
        )}
      </span>

      {/* Label */}
      <span className="transition-all duration-200">
        {disabled ? 'Sold out' : state === 'added' ? 'Added!' : state === 'adding' ? 'Adding…' : label}
      </span>

      {/* Ripple overlay on success */}
      {state === 'added' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-white/20 animate-[ping_0.5s_ease-out_once]"
          style={{ animation: 'ping 0.5s ease-out 1' }}
        />
      )}
    </button>
  )
}
