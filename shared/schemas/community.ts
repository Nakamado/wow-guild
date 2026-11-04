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

/** WoW-Charaktername: 2–12 Buchstaben (inkl. Umlaute/Akzente) */
export const CharacterNameSchema = z
  .string()
  .regex(/^\p{L}{2,12}$/u, 'Charakternamen bestehen aus 2–12 Buchstaben')

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
})
