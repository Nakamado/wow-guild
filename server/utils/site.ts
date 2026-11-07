import type { H3Event } from 'h3'

/** Öffentliche Basis-URL ohne Schrägstrich am Ende (NUXT_PUBLIC_SITE_URL) */
export function siteBase(event?: H3Event): string {
  return String(useRuntimeConfig(event).public.siteUrl || '').replace(/\/+$/, '')
}

/** Statische, öffentlich indexierbare Seiten (Mitglieder-, Profil- und Rechtsseiten sind „noindex“) */
export const publicPaths = ['/', '/gilde', '/rangliste', '/dungeons', '/gruppen', '/kalender', '/clips', '/streamer', '/regeln'] as const

/**
 * Gehört die Anfrage zur Hauptdomain? Auf Vorschau- und *.vercel.app-Adressen sollen Suchmaschinen
 * nichts indexieren, damit nicht die alte Vercel-Adresse statt mukimuki-forever.de in Google landet.
 */
export function isCanonicalHost(event: H3Event): boolean {
  const base = siteBase(event)
  if (!base) return false
  try {
    return getRequestHost(event, { xForwardedHost: true }).toLowerCase() === new URL(base).host.toLowerCase()
  }
  catch {
    return false
  }
}
