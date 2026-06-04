import { Star } from 'lucide-react'

export default function Stars({ rating, size = 14, showNumber = false, count }: { rating: number; size?: number; showNumber?: boolean; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rated ${rating} out of 5`}>
      <span className="inline-flex">
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.max(0, Math.min(1, rating - i))
          return (
            <span key={i} className="relative" style={{ width: size, height: size }}>
              <Star size={size} className="absolute inset-0 text-gold-100" fill="currentColor" />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="text-gold" fill="currentColor" />
              </span>
            </span>
          )
        })}
      </span>
      {showNumber && <span className="text-xs font-semibold text-navy-600">{rating.toFixed(1)}{count != null && <span className="text-slatey"> ({count})</span>}</span>}
    </span>
  )
}
