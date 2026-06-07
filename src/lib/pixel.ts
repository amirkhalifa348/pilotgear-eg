declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: unknown
  }
}

let initialised = false

/** Load and initialise the Facebook Pixel. Safe to call multiple times. */
export function initPixel(pixelId: string | undefined) {
  if (!pixelId || initialised) return
  initialised = true

  // Inject the fbevents loader inline — avoids an extra script tag in index.html
  // so the Pixel ID stays configurable from the admin dashboard.
  // eslint-disable-next-line
  ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []
    t = b.createElement(e); t.async = true; t.src = v
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

  window.fbq!('init', pixelId)
  // Fire PageView immediately after init (matches Meta's standard snippet).
  // This covers the case where the pixel ID was loaded from Supabase async,
  // so the pathname-change effect in ScrollAndTrack already ran as a no-op.
  window.fbq!('track', 'PageView')
}

/** Fire a standard or custom Pixel event. No-op if pixel is not loaded. */
export function pixel(event: string, params?: Record<string, unknown>) {
  if (typeof window.fbq === 'function') {
    window.fbq('track', event, params)
  }
}
