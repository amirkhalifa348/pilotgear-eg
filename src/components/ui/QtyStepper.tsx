import { Minus, Plus } from 'lucide-react'

export default function QtyStepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-navy-100 bg-white">
      <button
        type="button"
        aria-label="Decrease quantity"
        className="grid h-10 w-10 place-items-center rounded-full text-navy transition hover:bg-navy-50 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus size={16} />
      </button>
      <span className="w-10 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        className="grid h-10 w-10 place-items-center rounded-full text-navy transition hover:bg-navy-50 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
