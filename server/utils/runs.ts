import { can, type Viewer } from '#shared/domain/permissions'
import type { GroupRun, Participant } from '#shared/types'

/**
 * Besucher sehen die Besetzung (Rollen), aber nicht, WER teilnimmt.
 * Teilnehmer-IDs werden durch neutrale Platzhalter ersetzt.
 */
export function redactRun(run: GroupRun, viewer: Viewer): GroupRun {
  if (can(viewer, 'members:view')) return run
  const anonymize = (list: Participant[], prefix: string) =>
    list.map((participant, index) => ({ ...participant, memberId: `${prefix}-${index}`, characterId: `${prefix}-${index}` }))
  return {
    ...run,
    organizerId: 'hidden',
    participants: anonymize(run.participants, 'anon'),
    waitlist: anonymize(run.waitlist, 'anon-wait'),
  }
}
