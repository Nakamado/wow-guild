import type { GroupRun } from '#shared/types'
import { findDungeon } from '#shared/data/dungeons'
import { runChangeNotifications } from '#shared/domain/notifications'

/** Aufbewahrung der Benachrichtigungen (Tage) */
export const NOTIFICATION_RETENTION_DAYS = 30

/**
 * Benachrichtigungen zu einer Gruppenänderung anlegen. Best effort: Ein Fehler hier darf die
 * eigentliche Aktion (Anmelden, Absagen …) nie scheitern lassen – er wird nur geloggt.
 */
export async function notifyRunChange(before: GroupRun, after: GroupRun | null, actorId: string): Promise<void> {
  const store = useNotificationStore()
  if (!store) return
  try {
    const runTitle = before.title ?? findDungeon(before.dungeonSlug)?.name ?? 'Gruppe'
    // Charakternamen nur für An-/Abmeldungen nötig – die stehen nicht im Run selbst
    const before_ = new Set([...before.participants, ...before.waitlist].map(entry => entry.characterId))
    const after_ = new Set(after ? [...after.participants, ...after.waitlist].map(entry => entry.characterId) : [])
    const changed = [...before_, ...after_].filter(id => before_.has(id) !== after_.has(id))
    const names = new Map<string, string>()
    await Promise.all(changed.map(async (id) => {
      const character = await useProviders().characters.get(id).catch(() => null)
      if (character) names.set(id, character.name)
    }))
    const drafts = runChangeNotifications(before, after, { actorId, runTitle, characterName: id => names.get(id) })
    await store.create(drafts)
  }
  catch (error) {
    console.warn(`[notifications] Nicht angelegt für Gruppe ${before.id}: ${error instanceof Error ? error.message : 'unbekannt'}`)
  }
}
