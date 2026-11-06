import { checkCharacterInput, sortCharacters, withMainCharacter } from '#shared/domain/characters'
import { fail, ok, type DomainResult } from '#shared/domain/result'
import { MAX_CHARACTERS_PER_MEMBER } from '#shared/schemas/community'
import type { Character, CharacterInput, QuickCharacterInput } from '#shared/types'

export const DEMO_CHARACTERS_STORAGE_KEY = 'wow-guild:demo-characters'

/** Demo: komplette Charakterliste je Mitglied, ersetzt den Serverstand */
export const useDemoCharacterOverrides = () => useState<Record<string, Character[]>>('demo-character-overrides', () => ({}))

/**
 * Eigene Charaktere lesen und pflegen. Demo: lokal im sessionStorage, Live: über die API.
 * Beide Wege prüfen mit denselben Regeln (shared/domain/characters.ts).
 */
export function useCharacters() {
  const { isDemo, guild } = useSiteConfig()
  const { viewer, can } = useViewer()
  const overrides = useDemoCharacterOverrides()

  const canManage = computed(() => can('runs:join'))
  const { data, status } = useProtectedFetchSync<Character[]>('my-characters', '/api/me/characters', canManage)

  const mine = computed<Character[]>(() => {
    const memberId = viewer.value.memberId
    if (isDemo && memberId && overrides.value[memberId]) return overrides.value[memberId]
    return data.value ?? []
  })
  const main = computed(() => mine.value.find(character => character.isMain) ?? null)
  /** Erst nach dem Laden entscheiden, ob das Onboarding nötig ist */
  const loaded = computed(() => canManage.value && status.value === 'success')

  function saveDemo(list: Character[]) {
    const memberId = viewer.value.memberId!
    overrides.value = { ...overrides.value, [memberId]: sortCharacters(list) }
    try {
      sessionStorage.setItem(DEMO_CHARACTERS_STORAGE_KEY, JSON.stringify(overrides.value))
    }
    catch {
      // Speicher nicht verfügbar – gilt bis zum Neuladen
    }
  }

  async function afterLiveChange() {
    await refreshNuxtData(['my-characters', 'members'])
  }

  function guard(): DomainResult<string> {
    const memberId = viewer.value.memberId
    if (!canManage.value || !memberId) return fail('not-allowed', 'Nur Gildenmitglieder können Charaktere eintragen.')
    return ok(memberId)
  }

  /** `allowUnknown`: speichern, obwohl Blizzard den Namen (noch) nicht kennt – nach bewusster Bestätigung */
  async function create(input: CharacterInput, options: { allowUnknown?: boolean } = {}): Promise<DomainResult<Character>> {
    const allowed = guard()
    if (!allowed.ok) return allowed
    if (!isDemo) {
      const query = options.allowUnknown ? { allowUnknown: '1' } : undefined
      const result = await apiResult(() => $fetch<Character>('/api/me/characters', { method: 'POST', body: input, query }))
      if (result.ok) await afterLiveChange()
      return result
    }
    const check = checkCharacterInput(input, mine.value, { maxCharacters: MAX_CHARACTERS_PER_MEMBER })
    if (!check.ok) return check
    const character: Character = {
      ...check.value,
      id: `demo-char-${crypto.randomUUID()}`,
      memberId: allowed.value,
      realm: guild.realm,
      isMain: mine.value.length === 0,
      source: 'demo',
      updatedAt: new Date().toISOString(),
      professions: [],
    }
    saveDemo([...mine.value, character])
    return ok(character)
  }

  /**
   * Live: nur Name + Rollen – Stufe, Klasse, Volk und Fraktion holt der Server von Blizzard.
   * Bei `game-data-unavailable`/`game-data-incomplete` zeigt das Formular die vollen Felder
   * (bei unvollständigen Daten mit den bekannten Werten vorausgefüllt).
   */
  async function createFromGame(input: QuickCharacterInput): Promise<DomainResult<Character> & { prefill?: Partial<CharacterInput> }> {
    const allowed = guard()
    if (!allowed.ok) return allowed
    if (isDemo) return fail('game-data-unavailable', 'Im Demo-Modus gibt es keine Blizzard-Daten.')
    try {
      const character = await $fetch<Character>('/api/me/characters/from-game', { method: 'POST', body: input })
      await afterLiveChange()
      return ok(character)
    }
    catch (error) {
      const body = error as { data?: { message?: string, data?: { code?: string, prefill?: Partial<CharacterInput> } }, statusCode?: number }
      if (body.statusCode === 401) return fail('unauthorized', 'Bitte melde dich erneut mit Discord an.')
      const prefill = body.data?.data?.prefill
      const result = fail(body.data?.data?.code ?? 'request-failed', body.data?.message ?? 'Das hat leider nicht geklappt. Bitte versuche es später erneut.')
      return prefill ? { ...result, prefill } : result
    }
  }

  async function update(id: string, input: CharacterInput, options: { allowUnknown?: boolean } = {}): Promise<DomainResult<Character>> {
    const allowed = guard()
    if (!allowed.ok) return allowed
    if (!isDemo) {
      const query = options.allowUnknown ? { allowUnknown: '1' } : undefined
      const result = await apiResult(() => $fetch<Character>(`/api/me/characters/${id}` as string, { method: 'PATCH', body: input, query }))
      if (result.ok) await afterLiveChange()
      return result
    }
    const current = mine.value.find(character => character.id === id)
    if (!current) return fail('not-found', 'Diesen Charakter gibt es nicht (mehr).')
    const check = checkCharacterInput(input, mine.value, { editingId: id, maxCharacters: MAX_CHARACTERS_PER_MEMBER })
    if (!check.ok) return check
    const updated: Character = { ...current, ...check.value, updatedAt: new Date().toISOString() }
    saveDemo(mine.value.map(character => (character.id === id ? updated : character)))
    return ok(updated)
  }

  /** `signedUp`: Charakter steht in kommenden Runs (Demo prüft lokal, Live der Server) */
  async function remove(id: string, options: { signedUp: boolean }): Promise<DomainResult<true>> {
    const allowed = guard()
    if (!allowed.ok) return allowed
    const current = mine.value.find(character => character.id === id)
    if (!current) return fail('not-found', 'Diesen Charakter gibt es nicht (mehr).')
    if (options.signedUp) return fail('has-signups', `${current.name} ist noch für kommende Runs angemeldet. Melde ihn zuerst ab.`)
    if (!isDemo) {
      const result = await apiResult(() => $fetch<null>(`/api/me/characters/${id}` as string, { method: 'DELETE' }))
      if (result.ok) await afterLiveChange()
      return result.ok ? ok(true) : result
    }
    let rest = mine.value.filter(character => character.id !== id)
    const [next] = sortCharacters(rest)
    if (current.isMain && next) rest = withMainCharacter(rest, next.id)
    saveDemo(rest)
    return ok(true)
  }

  async function setMain(id: string): Promise<DomainResult<true>> {
    const allowed = guard()
    if (!allowed.ok) return allowed
    if (!isDemo) {
      const result = await apiResult(() => $fetch<Character[]>(`/api/me/characters/${id}/main` as string, { method: 'POST' }))
      if (result.ok) await afterLiveChange()
      return result.ok ? ok(true) : result
    }
    if (!mine.value.some(character => character.id === id)) return fail('not-found', 'Diesen Charakter gibt es nicht (mehr).')
    saveDemo(withMainCharacter(mine.value, id))
    return ok(true)
  }

  return { mine, main, loaded, canManage, create, createFromGame, update, remove, setMain }
}
