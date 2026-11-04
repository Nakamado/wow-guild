import type { Character, GroupRun } from '#shared/types'
import { GroupRunSchema } from '#shared/schemas/groups'
import { CharacterSchema } from '#shared/schemas/community'

function restore<T>(key: string, accept: (id: string, value: unknown) => T | null): Record<string, T> | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const valid: Record<string, T> = {}
    for (const [id, value] of Object.entries(JSON.parse(raw) as Record<string, unknown>)) {
      const entry = accept(id, value)
      if (entry !== null) valid[id] = entry
    }
    return valid
  }
  catch {
    sessionStorage.removeItem(key)
    return null
  }
}

/**
 * Stellt Demo-Änderungen (Gruppen, eigene Charaktere) aus dem sessionStorage wieder her –
 * erst NACH der Hydration, damit Server- und Client-HTML übereinstimmen.
 * Ungültige Einträge werden verworfen.
 */
export default defineNuxtPlugin({
  name: 'demo-runs',
  setup(nuxtApp) {
    if (!useSiteConfig().isDemo) return
    nuxtApp.hook('app:suspense:resolve', () => {
      const runs = restore<GroupRun>(DEMO_RUNS_STORAGE_KEY, (id, value) => {
        const result = GroupRunSchema.safeParse(value)
        return result.success && result.data.id === id ? result.data : null
      })
      if (runs) useDemoRunOverrides().value = runs

      const characters = restore<Character[]>(DEMO_CHARACTERS_STORAGE_KEY, (memberId, value) => {
        const result = CharacterSchema.array().safeParse(value)
        return result.success && result.data.every(character => character.memberId === memberId) ? result.data : null
      })
      if (characters) useDemoCharacterOverrides().value = characters
    })
  },
})
