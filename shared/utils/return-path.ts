/** Rücksprungziel nach dem Login: nur relative Pfade dieser Seite (kein Open Redirect). */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  return value.slice(0, 200)
}
