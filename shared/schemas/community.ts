import { z } from 'zod'
import {
  DataSourceSchema,
  FactionSchema,
  IdSchema,
  IsoDateTimeSchema,
  LevelSchema,
  RoleIdSchema,
  SlugSchema,
} from './common'

/** Community-Mitglied (Identität kommt von Discord) */
export const CommunityMemberSchema = z.object({
  id: IdSchema,
  discordId: z.string().min(1),
  displayName: z.string().min(1).max(64),
  avatarUrl: z.url().nullable(),
  profileUrl: z.url().nullable(),
  preferredRoles: z.array(RoleIdSchema),
  /** Trägt die Discord-Rolle „WoW Forever“ */
  isGuildMember: z.boolean(),
  /** Admin bzw. Event-Moderator */
  isAdmin: z.boolean(),
  source: DataSourceSchema,
})

/**
 * WoW: Forever: Vor- und Nachname, je 2–12 Buchstaben (inkl. Umlaute/Akzente),
 * kein Zeichen dreimal hintereinander. Gespeichert als „Vorname Nachname“.
 */
export const NAME_PART_PATTERN = /^\p{L}{2,12}$/u
const TRIPLE_PATTERN = /(\p{L})\1\1/iu

export const CharacterNameSchema = z
  .string()
  .regex(/^\p{L}{2,12} \p{L}{2,12}$/u, 'Vor- und Nachname bestehen aus je 2–12 Buchstaben')
  .refine(name => !TRIPLE_PATTERN.test(name), 'Ein Buchstabe darf nicht dreimal hintereinander stehen')

/** Schreibweise wie im Spiel: erster Buchstabe groß, Rest klein – je Namensteil */
export function formatNamePart(part: string): string {
  const lower = part.trim().toLocaleLowerCase('de-DE')
  return lower.charAt(0).toLocaleUpperCase('de-DE') + lower.slice(1)
}

/** Eingabe normalisieren: Leerzeichen zusammenfassen, Groß-/Kleinschreibung angleichen */
export function normalizeCharacterName(value: string): string {
  return value.trim().split(/\s+/u).filter(Boolean).map(formatNamePart).join(' ')
}

/** „Vorname Nachname“ → Teile (für das Formular) */
export function splitCharacterName(name: string): { firstName: string, lastName: string } {
  const [firstName = '', ...rest] = name.trim().split(/\s+/u)
  return { firstName, lastName: rest.join(' ') }
}

/** Berufe: zwei Hauptberufe, dazu bis zu drei Sekundärberufe (Angeln, Kochen, Erste Hilfe) */
export const ProfessionKindSchema = z.enum(['primary', 'secondary'])
export const ProfessionSourceSchema = z.enum(['blizzard-api', 'addon', 'manual', 'demo'])

export const ProfessionSchema = z.object({
  /** Berufs-ID aus dem Katalog (shared/data/professions.ts), z. B. „tailoring“ */
  id: SlugSchema,
  name: z.string().min(1),
  kind: ProfessionKindSchema,
  skill: z.number().int().min(0).max(1000),
  maxSkill: z.number().int().min(0).max(1000).nullable(),
  source: ProfessionSourceSchema,
})

export const CharacterSchema = z.object({
  id: IdSchema,
  memberId: IdSchema,
  name: CharacterNameSchema,
  realm: z.string().min(1),
  faction: FactionSchema,
  classId: SlugSchema,
  raceId: SlugSchema,
  level: LevelSchema,
  /** Rollen, die dieser Charakter spielen möchte (Teilmenge der Klassenrollen) */
  roles: z.array(RoleIdSchema).min(1),
  isMain: z.boolean(),
  source: DataSourceSchema,
  updatedAt: IsoDateTimeSchema,
  /** Berufe – kommen aus der Blizzard-API (später Addon/manuell); leer = unbekannt */
  professions: z.array(ProfessionSchema).max(5).default([]),
})

export const MAX_CHARACTERS_PER_MEMBER = 12

/**
 * Schnelles Eintragen: nur Name und Rollen – Stufe, Klasse, Volk und Fraktion holt der Server
 * aus der Blizzard-API. Rollen, die die Klasse nicht spielen kann, werden dabei verworfen.
 */
export const QuickCharacterInputSchema = z.object({
  name: z.string().transform(normalizeCharacterName).pipe(CharacterNameSchema),
  roles: z.array(RoleIdSchema).min(1, 'Wähle mindestens eine Rolle.').max(3)
    .refine(roles => new Set(roles).size === roles.length, 'Jede Rolle nur einmal.'),
})

/** Eingabe beim Anlegen/Bearbeiten eines eigenen Charakters (Regelsatz setzt der Server) */
export const CharacterInputSchema = z.object({
  name: z.string().transform(normalizeCharacterName).pipe(CharacterNameSchema),
  faction: FactionSchema,
  classId: SlugSchema,
  raceId: SlugSchema,
  level: z.coerce.number().pipe(LevelSchema),
  roles: z.array(RoleIdSchema).min(1, 'Wähle mindestens eine Rolle.').max(3)
    .refine(roles => new Set(roles).size === roles.length, 'Jede Rolle nur einmal.'),
})
