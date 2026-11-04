/**
 * Ergebnis einer Geschäftsregel: entweder erfolgreich oder mit verständlichem Fehler.
 * `message` ist für Nutzer formuliert (Deutsch), `code` für Logik und Tests.
 */
export interface DomainError<Code extends string = string> {
  code: Code
  message: string
}

export type DomainResult<T, Code extends string = string>
  = | { ok: true, value: T }
    | { ok: false, error: DomainError<Code> }

export function ok<T>(value: T): { ok: true, value: T } {
  return { ok: true, value }
}

export function fail<Code extends string>(code: Code, message: string): { ok: false, error: DomainError<Code> } {
  return { ok: false, error: { code, message } }
}
