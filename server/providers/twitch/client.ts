import { IntegrationError, requestJson, type FetchLike } from '../../lib/http'
import { HelixClipSchema, HelixStreamSchema, HelixUserSchema, TwitchTokenSchema, helixList } from './schemas'

const HELIX = 'https://api.twitch.tv/helix'
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token'

export interface TwitchClientOptions {
  fetch?: FetchLike
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

/**
 * Twitch Helix mit App-Access-Token (Client-Credentials-Flow).
 * Das Token wird bis kurz vor Ablauf wiederverwendet und bei 401 einmal erneuert.
 */
export function createTwitchClient(clientId: string, clientSecret: string, options: TwitchClientOptions = {}) {
  const now = options.now ?? Date.now
  let token: { value: string, expiresAt: number } | null = null
  // Gleichzeitige Anfragen teilen sich eine Token-Anforderung
  let pending: Promise<string> | null = null

  async function requestToken(): Promise<string> {
    const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' })
    const raw = await requestJson<unknown>(TOKEN_URL, { method: 'POST', body: params }, { service: 'twitch', ...options })
    const parsed = TwitchTokenSchema.parse(raw)
    token = { value: parsed.access_token, expiresAt: now() + parsed.expires_in * 1000 }
    return token.value
  }

  function getToken(force = false): Promise<string> {
    if (!force && token && token.expiresAt > now() + 60_000) return Promise.resolve(token.value)
    pending ??= requestToken().finally(() => {
      pending = null
    })
    return pending
  }

  async function helix(path: string, query: [string, string][]): Promise<unknown> {
    const url = `${HELIX}${path}?${new URLSearchParams(query)}`
    const call = async (force: boolean) =>
      requestJson<unknown>(url, { headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${await getToken(force)}` } }, { service: 'twitch', ...options })
    try {
      return await call(false)
    }
    catch (error) {
      if (error instanceof IntegrationError && error.status === 401) return call(true)
      throw error
    }
  }

  return {
    async getStreams(query: { userIds?: string[], logins?: string[] }) {
      const params: [string, string][] = [
        ...(query.userIds ?? []).map(id => ['user_id', id] as [string, string]),
        ...(query.logins ?? []).map(login => ['user_login', login] as [string, string]),
      ]
      if (!params.length) return []
      return helixList(HelixStreamSchema).parse(await helix('/streams', params)).data
    },

    /** Clips eines Kanals (Twitch sortiert nach Aufrufen). */
    async getClips(broadcasterId: string, options: { first: number, startedAt?: string }) {
      const params: [string, string][] = [['broadcaster_id', broadcasterId], ['first', String(options.first)]]
      if (options.startedAt) params.push(['started_at', options.startedAt])
      return helixList(HelixClipSchema).parse(await helix('/clips', params)).data
    },

    async getUsers(logins: string[]) {
      if (!logins.length) return []
      return helixList(HelixUserSchema).parse(await helix('/users', logins.map(login => ['login', login]))).data
    },
  }
}

export type TwitchClient = ReturnType<typeof createTwitchClient>
