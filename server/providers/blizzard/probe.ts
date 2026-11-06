import type { BlizzardClient, BlizzardResponse } from './client'

/**
 * API-Probe für WoW: Forever (Schritt 0 aus docs/ADDON-PLAN.md).
 * Testet, welche Endpunkte für unsere Gilde und den Account der Gildenleitung antworten,
 * und meldet Status + Feldnamen. Es wird nichts gespeichert; Tokens tauchen im Bericht nie auf.
 */
import type { ProbeCharacter, ProbeCheck, ProbeReport, ProbeResult } from '#shared/types/blizzard-probe'

export type { ProbeCharacter, ProbeCheck, ProbeReport, ProbeResult }

/** Bekannte Unterseiten eines Charakterprofils (Retail-Schema) – werden zusätzlich zu den Profil-Links getestet */
export const characterSubresources: { id: string, label: string, path: string }[] = [
  { id: 'equipment', label: 'Ausrüstung', path: 'equipment' },
  { id: 'professions', label: 'Berufe', path: 'professions' },
  { id: 'quests-completed', label: 'Abgeschlossene Quests', path: 'quests/completed' },
  { id: 'encounters-dungeons', label: 'Dungeon-Fortschritt', path: 'encounters/dungeons' },
  { id: 'encounters-raids', label: 'Raid-Fortschritt', path: 'encounters/raids' },
  { id: 'specializations', label: 'Talente', path: 'specializations' },
  { id: 'achievements', label: 'Erfolge', path: 'achievements' },
  { id: 'statistics', label: 'Statistiken', path: 'statistics' },
  { id: 'reputations', label: 'Ruf', path: 'reputations' },
]

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const hrefOf = (value: unknown): string | null => (isObject(value) && typeof value.href === 'string' ? value.href : null)
const text = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  // Blizzard liefert Namen oft lokalisiert ({ de_DE: … }) oder als Objekt mit name
  if (isObject(value)) return text(value.de_DE ?? value.en_GB ?? value.en_US ?? value.name)
  return null
}
const num = (value: unknown): number | null => (typeof value === 'number' ? value : null)

/** Für diese Tests zeigen wir einen kurzen Ausschnitt – sie entscheiden über API vs. Addon */
const SAMPLE_FIELDS: Record<string, string[] | null> = {
  'character-realmless': ['level', 'ruleset', 'faction', 'race', 'character_class', 'last_login_timestamp', 'realm', 'guild'],
  'character-realm': ['level', 'ruleset', 'realm', 'guild'],
  'character-encounters-dungeons': null,
  'character-encounters-raids': null,
  'character-professions': null,
  'guild-roster': null,
}

/** Ausschnitt: ausgewählte Felder bzw. die ganze Antwort, gekürzt */
export function sampleOf(id: string, body: unknown): string | undefined {
  if (!(id in SAMPLE_FIELDS) || body === null || body === undefined) return undefined
  const fields = SAMPLE_FIELDS[id]
  let value: unknown = body
  if (fields && isObject(body)) value = Object.fromEntries(fields.filter(key => key in body).map(key => [key, body[key]]))
  else if (isObject(body)) {
    const { character: _character, _links, ...rest } = body
    value = rest
  }
  const json = JSON.stringify(value)
  return json.length > 800 ? `${json.slice(0, 800)} …` : json
}

function resultOf(status: number): ProbeResult {
  if (status >= 200 && status < 300) return 'ok'
  if (status === 404) return 'missing'
  if (status === 401 || status === 403) return 'forbidden'
  return 'error'
}

/** Feldnamen: oberste Ebene, bei Listen der erste Eintrag (z. B. roster.members[0]) */
export function describeFields(body: unknown): string[] {
  if (!isObject(body)) return []
  const keys = Object.keys(body).filter(key => key !== '_links')
  const listKey = keys.find(key => Array.isArray(body[key]) && isObject((body[key] as unknown[])[0]))
  if (!listKey) return keys
  const first = (body[listKey] as Json[])[0]!
  const nested = Object.keys(first).map(key => `${listKey}[].${key}`)
  return [...keys, ...nested]
}

/** Charakter aus Account-Profil, Gildenliste oder Charakterprofil normalisieren (Felder variieren) */
export function toProbeCharacter(raw: Json): ProbeCharacter {
  const realm = isObject(raw.realm) ? raw.realm : null
  const fullName = [text(raw.name), text(raw.surname)].filter(Boolean).join(' ')
  return {
    name: fullName || '?',
    level: num(raw.level),
    className: text(raw.playable_class) ?? text(raw.character_class),
    raceName: text(raw.playable_race) ?? text(raw.race),
    characterId: num(raw.id),
    realmId: realm ? num(realm.id) : null,
    realmSlug: realm && typeof realm.slug === 'string' ? realm.slug : null,
    guildName: isObject(raw.guild) ? text(raw.guild.name) : null,
  }
}

/** Static-Namespace-Version aus Links wie …?namespace=static-1.60.1_70399-forever-eu lesen */
export function findStaticNamespace(body: unknown): string | null {
  const match = JSON.stringify(body ?? null).match(/namespace=(static-[\w.]+-forever-[a-z]{2})/)
  return match ? match[1]! : null
}

export interface ProbeOptions {
  region: string
  guildSlug?: string
  /** Battle.net-Token der Gildenleitung (optional) */
  userToken?: string | null
  now?: () => Date
}

export async function runBlizzardProbe(client: BlizzardClient, options: ProbeOptions): Promise<ProbeReport> {
  const region = options.region
  const namespaces = { profile: `profile-forever-${region}`, dynamic: `dynamic-forever-${region}`, static: null as string | null }
  const checks: ProbeCheck[] = []
  const report: ProbeReport = {
    ranAt: (options.now?.() ?? new Date()).toISOString(),
    region,
    namespaces,
    checks,
    realms: [],
    accountCharacters: [],
    guild: { slug: options.guildSlug || null, source: options.guildSlug ? 'config' : null, memberCount: null },
  }

  const record = (id: string, label: string, response: (BlizzardResponse & { url: string }) | null, note?: string): ProbeCheck => {
    const check: ProbeCheck = response
      ? { id, label, url: response.url, status: response.status, result: resultOf(response.status), fields: describeFields(response.body), note, sample: sampleOf(id, response.body) }
      : { id, label, url: null, status: null, result: 'skipped', fields: [], note }
    checks.push(check)
    return check
  }

  // 1. App-Token
  const app = await client.getAppToken()
  checks.push({ id: 'app-token', label: 'App-Token (Client-Credentials)', url: '/token', status: app.status, result: app.token ? 'ok' : resultOf(app.status || 500), fields: [] })
  if (!app.token) {
    checks[0]!.note = 'Client-ID oder Secret falsch? Ohne Token sind keine weiteren Tests möglich.'
    return report
  }
  const token = app.token

  // 2. Realms (versteckte Realm-IDs der Regelsätze)
  const realmIndex = await client.get('/data/wow/realm/index', namespaces.dynamic, token)
  record('realm-index', 'Realm-Index (versteckte Realms)', realmIndex)
  if (isObject(realmIndex.body) && Array.isArray(realmIndex.body.realms)) {
    report.realms = (realmIndex.body.realms as Json[]).map(realm => ({ id: num(realm.id) ?? 0, name: text(realm.name) ?? '?', slug: String(realm.slug ?? '') }))
  }

  // 3. Account-Profil (Battle.net-Login der Gildenleitung)
  let accountBody: unknown = null
  if (options.userToken) {
    const account = await client.get('/profile/user/wow', namespaces.profile, options.userToken)
    record('account', 'Eigene Charaktere (Battle.net-Account)', account)
    accountBody = account.body
    const accounts = isObject(account.body) && Array.isArray(account.body.wow_accounts) ? account.body.wow_accounts as Json[] : []
    const characters = accounts.flatMap(entry => (Array.isArray(entry.characters) ? entry.characters as Json[] : []))
    report.accountCharacters = characters.map(toProbeCharacter)
    if (!characters.length) checks.at(-1)!.note = 'Keine Forever-Charaktere im Account gefunden.'

    const protectedHref = characters.map(entry => hrefOf(entry.protected_character)).find(Boolean)
    if (protectedHref) record('protected-character', 'Geschützte Charakteransicht ({realmId}-{characterId})', await client.get(protectedHref, null, options.userToken))
    else record('protected-character', 'Geschützte Charakteransicht ({realmId}-{characterId})', null, 'Kein Link im Account-Profil.')
  }
  else {
    record('account', 'Eigene Charaktere (Battle.net-Account)', null, 'Battle.net nicht verbunden.')
  }

  // 4. Static-Namespace (Version ggf. aus den Account-Links)
  const plainStatic = `static-forever-${region}`
  const staticPlain = await client.get('/data/wow/playable-class/index', plainStatic, token)
  record('static-plain', `Spieldaten (${plainStatic})`, staticPlain)
  namespaces.static = staticPlain.status === 200 ? plainStatic : findStaticNamespace(accountBody)
  if (namespaces.static && namespaces.static !== plainStatic) {
    record('static-versioned', `Spieldaten (${namespaces.static})`, await client.get('/data/wow/playable-class/index', namespaces.static, token))
  }

  // 5. Charakterprofil: erster eigener Charakter
  const firstCharacter = isObject(accountBody) && Array.isArray(accountBody.wow_accounts)
    ? (accountBody.wow_accounts as Json[]).flatMap(entry => (Array.isArray(entry.characters) ? entry.characters as Json[] : []))[0]
    : undefined
  let profileBase: string | null = null
  if (firstCharacter) {
    const realmless = hrefOf(firstCharacter.character)
    if (realmless) {
      const response = await client.get(realmless, null, token)
      record('character-realmless', 'Charakterprofil (realmlos, Link aus dem Account)', response)
      if (response.status === 200) profileBase = new URL(realmless).pathname
    }
    const realm = isObject(firstCharacter.realm) ? firstCharacter.realm : null
    const first = text(firstCharacter.name)?.toLocaleLowerCase('de-DE')
    const last = text(firstCharacter.surname)?.toLocaleLowerCase('de-DE')
    // Zwei Schreibweisen testen: nur Vorname bzw. Vorname-Nachname (Forever-Slug-Format ist undokumentiert)
    const variants = [first, first && last ? `${first}-${last}` : null].filter((value): value is string => Boolean(value))
    for (const [index, name] of variants.entries()) {
      if (!realm || typeof realm.slug !== 'string') break
      const path = `/profile/wow/character/${realm.slug}/${encodeURIComponent(name)}`
      const response = await client.get(path, namespaces.profile, token)
      record(index === 0 ? 'character-realm' : 'character-realm-fullname', `Charakterprofil (Realm-Slug + ${index === 0 ? 'Vorname' : 'Vorname-Nachname'})`, response)
      if (!profileBase && response.status === 200) profileBase = path
      if (response.status === 200 && isObject(response.body) && isObject(response.body.guild) && !report.guild.slug) {
        const guildKey = hrefOf(response.body.guild.key)
        const slug = guildKey?.match(/\/guild\/(?:[^/]+\/)?([^/?]+)/)?.[1] ?? null
        if (slug) report.guild = { slug, source: 'character', memberCount: null }
      }
    }
  }
  else {
    record('character-realmless', 'Charakterprofil', null, 'Kein Charakter bekannt (Battle.net verbinden).')
  }

  // 6. Unterseiten des Profils (Ausrüstung, Berufe, Quests …)
  for (const sub of characterSubresources) {
    if (!profileBase) {
      record(`character-${sub.id}`, sub.label, null, 'Kein abrufbares Charakterprofil.')
      continue
    }
    record(`character-${sub.id}`, sub.label, await client.get(`${profileBase}/${sub.path}`, namespaces.profile, token))
  }

  // 7. Gildenliste
  if (report.guild.slug) {
    const roster = await client.get(`/data/wow/guild/${encodeURIComponent(report.guild.slug)}/roster`, namespaces.profile, token)
    record('guild-roster', `Gildenliste (${report.guild.slug})`, roster)
    if (isObject(roster.body) && Array.isArray(roster.body.members)) report.guild.memberCount = roster.body.members.length
  }
  else {
    record('guild-roster', 'Gildenliste', null, 'Gilden-Slug unbekannt (NUXT_BLIZZARD_GUILD_SLUG setzen oder Charakter in der Gilde verbinden).')
  }

  return report
}
