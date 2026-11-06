import type { FetchLike } from '../../lib/http'

/**
 * Schlanker Blizzard-Client für WoW: Forever. Wirft bei HTTP-Fehlern NICHT, sondern gibt Status und
 * Inhalt zurück – die API-Probe soll gerade auch 403/404 sichtbar machen.
 * Tokens werden nie geloggt oder zurückgegeben.
 */
export interface BlizzardResponse {
  status: number
  body: unknown
}

export const blizzardHosts = {
  api: (region: string) => `https://${region}.api.blizzard.com`,
  oauth: 'https://oauth.battle.net',
}

export function createBlizzardClient(
  config: { clientId: string, clientSecret: string, region: string },
  options: { fetch?: FetchLike, now?: () => number } = {},
) {
  const fetchImpl = options.fetch ?? fetch
  const now = options.now ?? Date.now
  const apiBase = blizzardHosts.api(config.region)
  let appToken: { value: string, expiresAt: number } | null = null

  async function parse(response: Response): Promise<unknown> {
    const text = await response.text()
    try {
      return text ? JSON.parse(text) : null
    }
    catch {
      return null
    }
  }

  /** App-Token (Client-Credentials) – für öffentliche Endpunkte */
  async function getAppToken(): Promise<BlizzardResponse & { token: string | null }> {
    if (appToken && appToken.expiresAt > now() + 60_000) return { status: 200, body: null, token: appToken.value }
    const response = await fetchImpl(`${blizzardHosts.oauth}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    const body = await parse(response) as { access_token?: string, expires_in?: number } | null
    if (!response.ok || !body?.access_token) return { status: response.status, body: null, token: null }
    appToken = { value: body.access_token, expiresAt: now() + (body.expires_in ?? 3600) * 1000 }
    return { status: response.status, body: null, token: appToken.value }
  }

  /**
   * GET gegen die Blizzard-API. `pathOrUrl` darf ein Pfad oder eine von Blizzard gelieferte `href` sein –
   * Tokens werden nur an *.api.blizzard.com geschickt.
   */
  async function get(pathOrUrl: string, namespace: string | null, token: string): Promise<BlizzardResponse & { url: string }> {
    const url = new URL(pathOrUrl, apiBase)
    if (!/^[a-z]{2}\.api\.blizzard\.com$/.test(url.host)) return { status: 0, body: null, url: url.pathname }
    if (namespace) url.searchParams.set('namespace', namespace)
    if (!url.searchParams.has('locale')) url.searchParams.set('locale', 'de_DE')
    const response = await fetchImpl(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    // Für die Anzeige: Pfad + Namespace, ohne Host-Details oder Token
    const shown = `${url.pathname}?namespace=${url.searchParams.get('namespace') ?? ''}`
    return { status: response.status, body: await parse(response), url: shown }
  }

  return { getAppToken, get }
}

export type BlizzardClient = ReturnType<typeof createBlizzardClient>
