import type { AppNotification, GroupRun, NotificationData, NotificationKind, Participant, RoleId } from '#shared/types'
import { formatDateTime } from '#shared/utils/datetime'

/** Noch nicht gespeicherte Benachrichtigung für genau ein Mitglied */
export interface NotificationDraft {
  memberId: string
  kind: NotificationKind
  runId: string | null
  data: NotificationData
}

export interface RunChangeContext {
  /** wer die Änderung ausgelöst hat – bekommt selbst keine Benachrichtigung */
  actorId: string
  /** Anzeigename der Gruppe (Titel oder Dungeon) */
  runTitle: string
  /** Charakternamen für An-/Abmeldungen */
  characterName?: (characterId: string) => string | undefined
}

const all = (run: GroupRun) => [...run.participants, ...run.waitlist]
const byMember = (list: Participant[]) => new Map(list.map(entry => [entry.memberId, entry]))

/**
 * Leitet aus dem Stand einer Gruppe vorher/nachher ab, wer worüber Bescheid bekommt.
 * `after = null` heißt: Gruppe gelöscht. Reine Funktion – die Datenbank bleibt die führende Quelle.
 */
export function runChangeNotifications(before: GroupRun, after: GroupRun | null, context: RunChangeContext): NotificationDraft[] {
  const drafts: NotificationDraft[] = []
  const base = (kind: NotificationKind, memberId: string, extra: Partial<NotificationData> = {}) => {
    if (memberId === context.actorId) return
    drafts.push({ memberId, kind, runId: after ? after.id : null, data: { runTitle: context.runTitle, ...extra } })
  }

  // Gelöscht: alle Angemeldeten (auch Warteliste)
  if (!after) {
    for (const entry of all(before)) base('run-deleted', entry.memberId)
    return dedupe(drafts)
  }

  // Abgesagt: alle Angemeldeten, mit Grund
  if (before.status !== 'cancelled' && after.status === 'cancelled') {
    for (const entry of all(after)) base('run-cancelled', entry.memberId, after.cancelReason ? { reason: after.cancelReason } : {})
    return dedupe(drafts)
  }

  // Termin verschoben: alle Angemeldeten
  if (before.startsAt !== after.startsAt) {
    for (const entry of all(after)) base('run-rescheduled', entry.memberId, { startsAt: after.startsAt })
  }

  const beforeIn = byMember(before.participants)
  const beforeWait = byMember(before.waitlist)
  const afterIn = byMember(after.participants)
  const afterWait = byMember(after.waitlist)
  const name = (entry: Participant) => context.characterName?.(entry.characterId)

  // Neu dabei (fest, als Supporter oder auf der Warteliste) → Organisation
  for (const entry of all(after)) {
    if (beforeIn.has(entry.memberId) || beforeWait.has(entry.memberId)) continue
    base('run-joined', after.organizerId, compact({ characterName: name(entry), role: entry.role, support: entry.support || undefined }))
  }
  // Abgemeldet → Organisation
  for (const entry of all(before)) {
    if (afterIn.has(entry.memberId) || afterWait.has(entry.memberId)) continue
    base('run-left', after.organizerId, compact({ characterName: name(entry), role: entry.role }))
  }

  for (const [memberId, entry] of afterWait) {
    // für eine feste Zusage auf die Warteliste gerutscht
    if (beforeIn.has(memberId)) base('run-bumped', memberId, { role: entry.role })
  }
  for (const [memberId, entry] of afterIn) {
    const previous = beforeIn.get(memberId)
    // von der Warteliste nachgerückt
    if (beforeWait.has(memberId)) base('run-promoted', memberId, { role: entry.role })
    // Flex: Rolle getauscht, damit jemand anderes Platz hat (nicht durch eigene Aktion)
    else if (previous && previous.role !== entry.role) base('run-relocated', memberId, { role: entry.role })
  }
  return dedupe(drafts)
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T
}

/** Gleiche Art für dieselbe Person nur einmal pro Änderung */
function dedupe(drafts: NotificationDraft[]): NotificationDraft[] {
  const seen = new Set<string>()
  return drafts.filter((draft) => {
    const key = `${draft.memberId}:${draft.kind}:${draft.data.characterName ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const ROLE_NAMES: Record<RoleId, string> = { tank: 'Tank', healer: 'Heiler', dps: 'Schaden' }

/** Text und Ziel einer Benachrichtigung für die Glocke */
export function describeNotification(notification: Pick<AppNotification, 'kind' | 'runId' | 'data'>): { text: string, href: string | null } {
  const { data } = notification
  const group = `„${data.runTitle}“`
  const who = data.characterName ?? 'Jemand'
  const role = data.role ? ROLE_NAMES[data.role] : null
  const href = notification.runId ? `/gruppen/${notification.runId}` : null
  switch (notification.kind) {
    case 'run-joined':
      return { href, text: `${who} hat sich für ${group} angemeldet${role ? ` (${role}${data.support ? ', Supporter' : ''})` : ''}.` }
    case 'run-left':
      return { href, text: `${who} hat sich von ${group} abgemeldet.` }
    case 'run-bumped':
      return { href, text: `Für eine feste Zusage bist du in ${group} auf die Warteliste gerutscht.` }
    case 'run-relocated':
      return { href, text: `Für eine Anmeldung wurde deine Rolle in ${group} getauscht${role ? ` – du spielst jetzt ${role}` : ''}.` }
    case 'run-promoted':
      return { href, text: `Du bist in ${group} von der Warteliste nachgerückt${role ? ` (${role})` : ''}.` }
    case 'run-rescheduled':
      return { href, text: `${group} hat einen neuen Termin${data.startsAt ? `: ${formatDateTime(data.startsAt)}` : ''}.` }
    case 'run-cancelled':
      return { href, text: `${group} wurde abgesagt${data.reason ? ` – ${data.reason}` : ''}.` }
    case 'run-deleted':
      return { href: null, text: `${group} wurde gelöscht.` }
  }
}

/** „gerade eben“, „vor 5 Min.“, „vor 3 Std.“, „vor 2 Tagen“ */
export function timeAgo(iso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'gestern' : `vor ${days} Tagen`
}
