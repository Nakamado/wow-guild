import type { H3Event } from 'h3'
import { createBlizzardClient, type BlizzardClient } from '../providers/blizzard/client'
import { characterSlug } from '../providers/blizzard/progress'

let cachedClient: { key: string, client: BlizzardClient } | null = null

/** Ein Client pro Zugangsdaten – so wird das App-Token zwischen Anfragen wiederverwendet */
function blizzardClient(event: H3Event): { client: BlizzardClient, region: string } | null {
  const { blizzard } = useRuntimeConfig(event)
  const clientId = String(blizzard.clientId ?? '')
  const clientSecret = String(blizzard.clientSecret ?? '')
  if (!clientId || !clientSecret) return null
  const region = String(blizzard.region || 'eu').toLowerCase()
  const key = `${clientId}:${region}`
  if (cachedClient?.key !== key) cachedClient = { key, client: createBlizzardClient({ clientId, clientSecret, region }) }
  return { client: cachedClient.client, region }
}

/**
 * Prüft beim Eintragen, ob es den Charakter in WoW: Forever gibt (Nachweis auf Vertrauensbasis:
 * Eigentum wird nicht geprüft, nur die Existenz).
 * - Blizzard sagt eindeutig „gibt es nicht“ (404) → 422 mit verständlicher Meldung
 * - Demo-Modus, fehlende Zugangsdaten oder API-Störung → nicht blockieren
 */
export async function assertCharacterExistsInGame(event: H3Event, name: string): Promise<void> {
  if (useRuntimeConfig(event).public.demoMode) return
  const blizzard = blizzardClient(event)
  if (!blizzard) return
  try {
    const app = await blizzard.client.getAppToken()
    if (!app.token) return
    const slug = characterSlug(name)
    const response = await blizzard.client.get(`/profile/wow/character/${encodeURIComponent(slug)}`, `profile-forever-${blizzard.region}`, app.token)
    if (response.status !== 404) return
  }
  catch (error) {
    console.warn(`[blizzard] Charakterprüfung übersprungen: ${error instanceof Error ? error.message : 'unbekannt'}`)
    return
  }
  rejectWith({
    code: 'character-not-in-game',
    message: `„${name}“ wurde in WoW: Forever (EU) nicht gefunden. Bitte Vor- und Nachnamen prüfen. `
      + 'Ganz neue Charaktere kennt die Blizzard-API erst nach einigen Stunden – dann einfach später noch einmal versuchen.',
  })
}
