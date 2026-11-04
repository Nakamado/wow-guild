import type { FetchError } from 'ofetch'
import { fail, ok, type DomainResult } from '#shared/domain/result'

interface ApiErrorBody {
  message?: string
  data?: { code?: string }
}

/**
 * Schreibanfrage an die eigene API als `DomainResult` – so behandeln Komponenten
 * Demo (lokal) und Live (Server) identisch. Fehlertexte kommen vom Server.
 */
export async function apiResult<T>(request: () => Promise<T>): Promise<DomainResult<T>> {
  try {
    return ok(await request())
  }
  catch (error) {
    const body = (error as FetchError<ApiErrorBody>).data
    const status = (error as FetchError).statusCode
    if (status === 401) return fail('unauthorized', 'Bitte melde dich erneut mit Discord an.')
    return fail(body?.data?.code ?? 'request-failed', body?.message ?? 'Das hat leider nicht geklappt. Bitte versuche es später erneut.')
  }
}
