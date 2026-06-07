declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: unknown
  }
}

/**
 * Fire a standard or custom Meta Pixel event.
 * The pixel is initialised in index.html so fbq is available from the very
 * first byte — this helper just wraps the call with a safety check.
 */
export function pixel(event: string, params?: Record<string, unknown>) {
  if (typeof window.fbq === 'function') {
    window.fbq('track', event, params)
  }
}

/**
 * No-op kept for import compatibility. The pixel is now bootstrapped in
 * index.html with a hardcoded ID and no longer needs runtime initialisation.
 */
export function initPixel(_pixelId: string | undefined) {}
