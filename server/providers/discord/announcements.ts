import type { Dungeon, GroupRun, GuildEvent, Participant, RoleId } from '#shared/types'
import { computeComposition } from '#shared/domain/composition'
import { dungeonQuestOptions } from '#shared/domain/quests'
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
export const discordTime = (iso: string, style: 'F' | 'R' | 't' = 'F') => `<t:${unix(iso)}:${style}>`
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

/** Hauptnachricht einer Gruppe – wird bei jeder Änderung neu gerendert und bearbeitet */
export function runAnnouncement(run: GroupRun, dungeon: Dungeon | undefined, siteUrl: string): DiscordMessageBody {
  const title = runDisplayTitle(run, dungeon)
  const url = `${siteUrl}/gruppen/${run.id}`
  const cancelled = run.status === 'cancelled'
  const composition = computeComposition(run)
  const supporters = run.participants.filter(entry => entry.support).length

  const lines: string[] = []
  if (run.title && dungeon) lines.push(`**${escapeDiscord(dungeon.name)}** · Stufe ${dungeon.levelRange.min}–${dungeon.levelRange.max}`)
  if (run.description) lines.push(escapeDiscord(clip(run.description, 500)))

  const fields: { name: string, value: string, inline?: boolean }[] = [
    { name: 'Termin', value: `${discordTime(run.startsAt)} (${discordTime(run.startsAt, 'R')})`, inline: false },
    { name: 'Organisation', value: mention(run.organizerId), inline: true },
  ]
  if (cancelled) {
    fields.push({ name: 'Abgesagt', value: run.cancelReason ? escapeDiscord(run.cancelReason) : 'ohne Angabe von Gründen', inline: false })
  }
  else {
    const slots = composition.slots.filter(slot => slot.capacity > 0).map(slot => `${ROLE_NAMES[slot.role]} ${slot.filled}/${slot.capacity}`)
    const open = composition.slots.filter(slot => slot.open > 0).map(slot => ROLE_NAMES[slot.role])
    const status = composition.isFull
      ? `Voll${run.waitlistEnabled ? ` – Warteliste offen${run.waitlist.length ? ` (${run.waitlist.length})` : ''}` : ''}`
      : `Sucht noch: ${open.join(', ')}`
    fields.push({
      name: `Besetzung ${composition.filled}/${composition.capacity}`,
      value: [slots.join(' · '), status, supporters ? `davon ${supporters} als Supporter` : ''].filter(Boolean).join('\n'),
      inline: true,
    })
  }
  const quests = questTitles(run)
  if (quests.length) fields.push({ name: 'Geplante Quests', value: clip(quests.map(entry => `• ${escapeDiscord(entry)}`).join('\n'), 1024), inline: false })

  return {
    embeds: [{
      title: clip(cancelled ? `Abgesagt: ${title}` : title, 256),
      url,
      description: lines.length ? clip(lines.join('\n\n'), 4096) : undefined,
      color: cancelled ? COLOR_CANCELLED : composition.isFull ? COLOR_FULL : COLOR_OPEN,
      fields,
      footer: { text: cancelled ? 'Diese Gruppe wurde abgesagt.' : 'Anmelden auf der Gildenseite · Neuigkeiten im Thread' },
    }],
    components: cancelled ? [] : linkButton('Zur Anmeldung', url),
    allowed_mentions: NO_PINGS,
  }
}

function questTitles(run: GroupRun): string[] {
  const ids = run.questIds ?? []
  if (!ids.length) return []
  const titles = new Map(dungeonQuestOptions(run.dungeonSlug).map(option => [option.id, option.title]))
  const list = ids.map(id => titles.get(id) ?? `Quest ${id}`)
  return list.length > 8 ? [...list.slice(0, 8), `… und ${list.length - 8} weitere`] : list
}

/** Hauptnachricht eines Gilden-Events (ohne Thread) */
export function guildEventAnnouncement(event: GuildEvent, siteUrl: string): DiscordMessageBody {
  const cancelled = event.status === 'cancelled'
  const url = `${siteUrl}/kalender?ansicht=liste`
  const time = event.endsAt ? `${discordTime(event.startsAt)} – ${discordTime(event.endsAt, 't')}` : discordTime(event.startsAt)
  const fields = [
    { name: 'Termin', value: `${time} (${discordTime(event.startsAt, 'R')})`, inline: false },
    ...(event.location ? [{ name: 'Treffpunkt', value: escapeDiscord(event.location), inline: true }] : []),
    { name: 'Eingetragen von', value: mention(event.createdBy), inline: true },
    ...(cancelled ? [{ name: 'Abgesagt', value: event.cancelReason ? escapeDiscord(event.cancelReason) : 'ohne Angabe von Gründen', inline: false }] : []),
  ]
  return {
    embeds: [{
      title: clip(cancelled ? `Abgesagt: ${event.title}` : event.title, 256),
      url,
      description: event.description ? clip(escapeDiscord(event.description), 1000) : undefined,
      color: cancelled ? COLOR_CANCELLED : 0xF5B768,
      fields,
      footer: { text: cancelled ? 'Dieses Event wurde abgesagt.' : 'Gilden-Event · alle Termine im Kalender der Gildenseite' },
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
  if (before.startsAt !== after.startsAt) lines.push(`🕒 Neuer Termin: ${discordTime(after.startsAt)}`)

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
