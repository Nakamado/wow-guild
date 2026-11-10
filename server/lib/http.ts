/**
 * Gemeinsame HTTP-Helfer für externe APIs (Discord, Twitch).
 * - Ein erneuter Versuch bei Rate-Limits (429) bzw. kurzzeitigen Serverfehlern (5xx)
 * - Fehlertexte ohne Tokens oder Antwortkörper (datenschutzgerechtes Logging)
 */
export class IntegrationError extends Error {
  constructor(
    readonly service: 'discord' | 'twitch' | 'supabase',
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'IntegrationError'
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface RequestOptions {
  service: IntegrationError['service']
  fetch?: FetchLike
  /** Maximale Wartezeit vor dem zweiten Versuch (ms) */
  maxRetryDelay?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Wartezeit aus Retry-After (Sekunden) bzw. Discords `retry_after` im JSON. */
async function retryDelay(response: Response): Promise<number> {
  const header = response.headers.get('retry-after')
  if (header && Number.isFinite(Number(header))) return Number(header) * 1000
  try {
    const body = await response.clone().json() as { retry_after?: number }
    if (typeof body.retry_after === 'number') return body.retry_after * 1000
  }
  catch {
    // kein JSON
  }
  return 1000
}

export async function requestJson<T>(url: string, init: RequestInit, options: RequestOptions): Promise<T> {
  const fetchImpl = options.fetch ?? fetch
  const sleep = options.sleep ?? defaultSleep
  const maxDelay = options.maxRetryDelay ?? 5000

  let response = await fetchImpl(url, init)
  if (response.status === 429 || response.status >= 500) {
    const delay = response.status === 429 ? await retryDelay(response) : 500
    if (delay <= maxDelay) {
      await sleep(delay)
      response = await fetchImpl(url, init)
    }
  }

  if (!response.ok) {
    // Pfad ohne Query (kann IDs, aber keine Tokens enthalten)
    const path = url.split('?')[0]
    throw new IntegrationError(options.service, response.status, `${options.service} ${response.status} bei ${path}`)
  }
  // z. B. DELETE ohne Antwortinhalt
  if (response.status === 204) return undefined as T
  return await response.json() as T
}

/** Einfacher Zeit-Cache pro Server-Instanz (Rate-Limits schonen). */
export function createTtlCache() {
  const store = new Map<string, { expires: number, value: Promise<unknown> }>()
  return {
    async get<T>(key: string, ttlMs: number, load: () => Promise<T>, now = Date.now()): Promise<T> {
      const hit = store.get(key)
      if (hit && hit.expires > now) return hit.value as Promise<T>
      const value = load()
      store.set(key, { expires: now + ttlMs, value })
      // Fehler nicht cachen
      value.catch(() => store.delete(key))
      return value
    },
    clear() {
      store.clear()
    },
  }
}
