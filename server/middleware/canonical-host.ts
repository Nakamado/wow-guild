/**
 * Live (Vercel Production): Aufrufe über die alte *.vercel.app-Adresse dauerhaft (308) auf die
 * Hauptdomain umleiten – sonst bliebe die Vercel-Adresse versehentlich parallel erreichbar.
 * Vorschau-Deployments (VERCEL_ENV=preview) und lokale Entwicklung bleiben unberührt.
 */
export default defineEventHandler((event) => {
  if (process.env.VERCEL_ENV !== 'production') return
  const base = siteBase(event)
  if (!base || isCanonicalHost(event)) return
  let target: URL
  try {
    target = new URL(base)
  }
  catch {
    return
  }
  // Nur umleiten, wenn die Hauptdomain wirklich eine eigene Domain ist
  if (target.hostname.endsWith('.vercel.app') || target.hostname === 'localhost') return
  const host = getRequestHost(event, { xForwardedHost: true }).toLowerCase()
  if (!host.endsWith('.vercel.app')) return
  return sendRedirect(event, `${base}${event.path}`, 308)
})
