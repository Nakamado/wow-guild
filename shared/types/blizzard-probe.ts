/** Bericht der Blizzard-API-Probe (Server erzeugt, Admin-Seite zeigt an) */
export type ProbeResult = 'ok' | 'missing' | 'forbidden' | 'error' | 'skipped'

export interface ProbeCheck {
  id: string
  label: string
  /** Pfad + Namespace (ohne Host und Token) */
  url: string | null
  status: number | null
  result: ProbeResult
  /** Feldnamen der Antwort (bzw. des ersten Listeneintrags) – zeigt, was Blizzard liefert */
  fields: string[]
  note?: string
  /** Kurzer Ausschnitt der Antwort für ausgewählte Endpunkte (ohne Gold/Position) */
  sample?: string
}

export interface ProbeRealm {
  id: number
  name: string
  slug: string
}

export interface ProbeCharacter {
  name: string
  level: number | null
  className: string | null
  raceName: string | null
  characterId: number | null
  realmId: number | null
  realmSlug: string | null
  guildName: string | null
}

export interface ProbeReport {
  ranAt: string
  region: string
  namespaces: { profile: string, dynamic: string, static: string | null }
  checks: ProbeCheck[]
  realms: ProbeRealm[]
  accountCharacters: ProbeCharacter[]
  guild: { slug: string | null, source: 'config' | 'character' | null, memberCount: number | null }
}
