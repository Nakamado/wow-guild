import { randomUUID } from 'node:crypto'
import { checkGrant, detectImageType, imageContentTypes, MAX_EVIDENCE_BYTES } from '#shared/domain/admin'
import { consentChannelLabels, LeaderboardGrantInputSchema } from '#shared/schemas/admin'
import { toZonedParts } from '#shared/utils/datetime'

/**
 * Ranglistenfreigabe mit dokumentierter Zustimmung anlegen (nur Hauptadmin).
 * Multipart-Formular: Felder wie LeaderboardGrantInputSchema, optional `evidence` (PNG/JPEG/WebP, max. 3 MB).
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await requirePermission(event, 'leaderboard:grant')
  const grants = requireStore(useGrantStore())
  const settings = requireStore(useMemberSettingsStore())

  const parts = (await readMultipartFormData(event)) ?? []
  const field = (name: string) => parts.find(part => part.name === name && !part.filename)?.data.toString('utf8')
  const parsed = LeaderboardGrantInputSchema.safeParse({
    memberId: field('memberId'),
    characterId: field('characterId'),
    consentChannel: field('consentChannel'),
    consentDate: field('consentDate'),
    note: field('note'),
    confirmed: field('confirmed') === 'true',
  })
  if (!parsed.success) rejectWith({ code: 'invalid-input', message: parsed.error.issues[0]?.message ?? 'Bitte prüfe die Angaben.' })
  const input = parsed.data

  // Nachweis: Typ anhand des Inhalts prüfen, nicht anhand des Dateinamens
  const file = parts.find(part => part.name === 'evidence' && part.filename && part.data.length)
  let evidence: { path: string, bytes: Uint8Array, contentType: string } | null = null
  if (file) {
    if (file.data.length > MAX_EVIDENCE_BYTES) rejectWith({ code: 'evidence-too-large', message: 'Der Screenshot ist zu groß (höchstens 3 MB).' }, 413)
    const bytes = new Uint8Array(file.data)
    const type = detectImageType(bytes)
    if (!type) rejectWith({ code: 'evidence-type', message: 'Bitte nur PNG, JPEG oder WebP hochladen.' }, 415)
    evidence = { path: `${randomUUID()}.${type}`, bytes, contentType: imageContentTypes[type] }
  }

  const [character, member, active] = await Promise.all([
    useProviders().characters.get(input.characterId),
    persist(() => settings.revokedAt(input.memberId)),
    persist(() => grants.listActive()),
  ])
  if (member === undefined) rejectWith({ code: 'not-found', message: 'Dieses Mitglied gibt es nicht (mehr).' }, 404)
  const check = checkGrant({
    consentDate: input.consentDate,
    today: toZonedParts(new Date()).date,
    characterOwnerId: character?.memberId ?? null,
    memberId: input.memberId,
    revokedOn: member ? toZonedParts(member).date : null,
    activeGrantExists: active.some(grant => grant.characterId === input.characterId),
  })
  if (!check.ok) rejectWith(check.error)

  const created = await persist(() => grants.create(input, viewer.memberId!, evidence))
  await logActivity({
    action: 'leaderboard.granted',
    actorId: viewer.memberId,
    subjectType: 'leaderboard',
    subjectId: input.characterId,
    summary: `${character!.name} freigegeben (Zustimmung vom ${input.consentDate}, ${consentChannelLabels[input.consentChannel]}${evidence ? ', mit Nachweis' : ''})`,
  })
  setResponseStatus(event, 201)
  return created
})
