import type { Dungeon, GroupRun, GuildEvent, Participant, RoleId } from '#shared/types'
import { computeComposition } from '#shared/domain/composition'
import { formatDate, formatTime } from '#shared/utils/datetime'
import type { DiscordMessageBody } from './client'

/**
 * Bausteine für die Discord-Ankündigungen (reine Funktionen, gut testbar):
 * eine Nachricht pro Gruppe bzw. Gilden-Event, die bei Änderungen bearbeitet wird,
 * und kurze Zeilen für den Thread unter einer Gruppe. Niemals Pings.
 */

const NO_PINGS = { parse: [] } as const
const COLOR_OPEN = 0x8FD3FF
const COLOR_FULL = 0x7EE2A8
const COLOR_CANCELLED = 0x7E8CB0

const ROLE_NAMES: Record<RoleId, string> = { tank: 'Tank', healer: 'Heiler', dps: 'Schaden' }

/** Markdown und Erwähnungen in Nutzertext entschärfen */
export function escapeDiscord(text: string): string {
  return text.replace(/([\\*_~`|>[\]])/g, '\\$1').replace(/@/g, '@\u200B').replace(/</g, '<\u200B')
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
const unix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
/** Discord zeigt Zeitstempel in der Zeitzone der jeweiligen Person an */
export const discordTime = (iso: string, style: 'F' | 'R' | 't' | 'd' = 'F') => `<t:${unix(iso)}:${style}>`
const mention = (memberId: string) => (/^\d{5,25}$/.test(memberId) ? `<@${memberId}>` : 'jemandem aus der Gilde')

function linkButton(label: string, url: string) {
  return [{ type: 1, components: [{ type: 2, style: 5, label, url }] }]
}

export function runDisplayTitle(run: Pick<GroupRun, 'title'>, dungeon: Pick<Dungeon, 'name'> | undefined): string {
  return run.title ?? dungeon?.name ?? 'Gruppe'
}

/** Thread-Name, z. B. „Todesminen · 13.11. 19:00“ */
export function runThreadName(run: GroupRun, dungeon: Dungeon | undefined): string {
  return clip(`${runDisplayTitle(run, dungeon)} · ${formatDate(run.startsAt).slice(0, 6)} ${formatTime(run.startsAt)}`, 100)
}

/** Termin kompakt, z. B. „10.11.2026, 22:00 (in 7 Stunden)“ – in der Zeitzone der jeweiligen Person */
export const discordDate = (iso: string) => `${discordTime(iso, 'd')}, ${discordTime(iso, 't')} (${discordTime(iso, 'R')})`

/** Hauptnachricht einer Gruppe – kompakt, wird bei jeder Änderung neu gerendert und bearbeitet */
export function runAnnouncement(run: GroupRun, dungeon: Dungeon | undefined, siteUrl: string): DiscordMessageBody {
  const title = runDisplayTitle(run, dungeon)
  const url = `${siteUrl}/gruppen/${run.id}`
  const cancelled = run.status === 'cancelled'
  const composition = computeComposition(run)
  const supporters = run.participants.filter(entry => entry.support).length
  const questCount = run.questIds?.length ?? 0

  const head = [
    dungeon ? `**${escapeDiscord(dungeon.name)}** · Stufe ${dungeon.levelRange.min}–${dungeon.levelRange.max}` : null,
    questCount ? `${questCount} ${questCount === 1 ? 'Quest' : 'Quests'} geplant` : null,
  ].filter(Boolean).join(' · ')

  const lines = [head, `🗓️ ${discordDate(run.startsAt)}`]
  if (cancelled) {
    lines.push(`❌ Abgesagt${run.cancelReason ? `: ${escapeDiscord(run.cancelReason)}` : ''}`)
  }
  else {
    // offene Rollen ergeben sich aus der Besetzung – nur bei voller Gruppe der Hinweis auf die Warteliste
    const slots = composition.slots.filter(slot => slot.capacity > 0).map(slot => `${ROLE_NAMES[slot.role]} ${slot.filled}/${slot.capacity}`)
    const waitlist = composition.isFull && run.waitlistEnabled ? ` · Warteliste${run.waitlist.length ? ` (${run.waitlist.length})` : ' offen'}` : ''
    lines.push(`👥 ${composition.filled}/${composition.capacity} · ${slots.join(' · ')}${supporters ? ` · ${supporters} Supporter` : ''}${waitlist}`)
  }
  lines.push(`Organisation: ${mention(run.organizerId)}`)

  return {
    embeds: [{
      title: clip(cancelled ? `Abgesagt: ${title}` : title, 256),
      url,
      description: clip(lines.filter(Boolean).join('\n'), 4096),
      color: cancelled ? COLOR_CANCELLED : composition.isFull ? COLOR_FULL : COLOR_OPEN,
    }],
    components: cancelled ? [] : linkButton('Zur Anmeldung', url),
    allowed_mentions: NO_PINGS,
  }
}

/** Hauptnachricht eines Gilden-Events (ohne Thread), im selben kompakten Stil */
export function guildEventAnnouncement(event: GuildEvent, siteUrl: string): DiscordMessageBody {
  const cancelled = event.status === 'cancelled'
  const url = `${siteUrl}/kalender?ansicht=liste`
  const time = event.endsAt
    ? `${discordTime(event.startsAt, 'd')}, ${discordTime(event.startsAt, 't')}–${discordTime(event.endsAt, 't')} (${discordTime(event.startsAt, 'R')})`
    : discordDate(event.startsAt)
  const lines = [
    event.description ? escapeDiscord(clip(event.description, 200)) : null,
    `🗓️ ${time}`,
    event.location ? `📍 ${escapeDiscord(event.location)}` : null,
    cancelled ? `❌ Abgesagt${event.cancelReason ? `: ${escapeDiscord(event.cancelReason)}` : ''}` : null,
    `Eingetragen von ${mention(event.createdBy)}`,
  ]
  return {
    embeds: [{
      title: clip(cancelled ? `Abgesagt: ${event.title}` : event.title, 256),
      url,
      description: lines.filter(Boolean).join('\n'),
      color: cancelled ? COLOR_CANCELLED : 0xF5B768,
    }],
    components: cancelled ? [] : linkButton('Zum Kalender', url),
    allowed_mentions: NO_PINGS,
  }
}

const byMember = (list: Participant[]) => new Map(list.map(entry => [entry.memberId, entry]))

/**
 * Kurze Zeilen für den Thread, abgeleitet aus dem Stand vorher/nachher.
 * `name` liefert den Charakternamen zu einer Charakter-ID.
 */
export function runThreadLines(before: GroupRun, after: GroupRun, name: (characterId: string) => string | undefined): string[] {
  const label = (entry: Participant) => `**${escapeDiscord(name(entry.characterId) ?? 'Jemand')}**`
  const role = (entry: Participant) => ROLE_NAMES[entry.role]
  const lines: string[] = []

  if (before.status !== 'cancelled' && after.status === 'cancelled') {
    return [`❌ Die Gruppe wurde abgesagt${after.cancelReason ? `: ${escapeDiscord(after.cancelReason)}` : '.'}`]
  }
  if (before.startsAt !== after.startsAt) lines.push(`🕒 Neuer Termin: ${discordDate(after.startsAt)}`)

  const beforeIn = byMember(before.participants)
  const beforeWait = byMember(before.waitlist)
  const afterIn = byMember(after.participants)
  const afterWait = byMember(after.waitlist)

  for (const entry of after.participants) {
    if (beforeIn.has(entry.memberId)) continue
    if (beforeWait.has(entry.memberId)) lines.push(`⬆️ ${label(entry)} ist von der Warteliste nachgerückt (${role(entry)}).`)
    else lines.push(`➕ ${label(entry)} ist dabei als ${role(entry)}${entry.support ? ' (Supporter)' : ''}.`)
  }
  for (const entry of after.waitlist) {
    if (beforeIn.has(entry.memberId)) lines.push(`↩️ ${label(entry)} macht als Supporter Platz und steht jetzt auf der Warteliste.`)
    else if (!beforeWait.has(entry.memberId)) lines.push(`⏳ ${label(entry)} steht auf der Warteliste (${role(entry)}).`)
  }
  for (const entry of [...before.participants, ...before.waitlist]) {
    if (!afterIn.has(entry.memberId) && !afterWait.has(entry.memberId)) lines.push(`➖ ${label(entry)} hat sich abgemeldet.`)
  }
  for (const [memberId, entry] of afterIn) {
    const previous = beforeIn.get(memberId)
    if (previous && previous.role !== entry.role) lines.push(`🔄 ${label(entry)} wechselt zu ${role(entry)}.`)
  }
  return lines
}
