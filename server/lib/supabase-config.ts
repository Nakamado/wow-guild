/**
 * Häufige Einrichtungsfehler bei Supabase früh erkennen (statt kryptischer PostgREST-Fehler):
 * - URL mit Pfad (`/rest/v1`, Schrägstrich) → wird bereinigt
 * - öffentlicher Key (publishable/anon) statt Server-Key → wird abgelehnt
 */
export function normalizeSupabaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, '').replace(/\/+$/, '')
}

export type SupabaseKeyKind = 'secret' | 'public' | 'unknown'

export function classifySupabaseKey(key: string): SupabaseKeyKind {
  const value = key.trim()
  if (value.startsWith('sb_secret_')) return 'secret'
  if (value.startsWith('sb_publishable_')) return 'public'
  // Legacy-Keys sind JWTs mit der Rolle im Payload
  const payload = value.split('.')[1]
  if (payload) {
    try {
      const { role } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: string }
      if (role === 'service_role') return 'secret'
      if (role === 'anon' || role === 'authenticated') return 'public'
    }
    catch {
      // kein JWT
    }
  }
  return 'unknown'
}
