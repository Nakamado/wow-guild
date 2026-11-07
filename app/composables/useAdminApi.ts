/** Fehlermeldung des Servers für die Oberfläche */
export function apiErrorMessage(error: unknown): string {
  const body = error as { data?: { message?: string }, statusCode?: number }
  if (body.statusCode === 401) return 'Bitte melde dich erneut mit Discord an.'
  return body.data?.message ?? 'Das hat leider nicht geklappt. Bitte versuche es später erneut.'
}
