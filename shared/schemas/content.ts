import { z } from 'zod'

/** Redaktionelle Inhalte aus content/*.ts – per Test gegen diese Schemas geprüft. */

export const GuildContentSchema = z.object({
  /** true, solange die Texte Platzhalter sind und noch nicht von der Gildenleitung stammen */
  isDraft: z.boolean(),
  tagline: z.string().min(1),
  intro: z.array(z.string().min(1)).min(1),
  values: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })).min(1),
  activities: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })).min(1),
  focus: z.object({ pve: z.string(), dungeons: z.string(), raids: z.string() }),
  contacts: z.array(z.object({
    role: z.string().min(1),
    name: z.string().min(1),
    /** Platzhalter, bis echte Ansprechpartner feststehen */
    isPlaceholder: z.boolean(),
  })),
})

export const RulesContentSchema = z.object({
  /** true = klar gekennzeichnete Beispielregeln, bis Miinyus offizielle Regeln feststehen */
  isExample: z.boolean(),
  updatedAt: z.iso.date(),
  intro: z.string().min(1),
  sections: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    rules: z.array(z.string().min(1)).min(1),
  })).min(1),
})

export type GuildContent = z.infer<typeof GuildContentSchema>
export type RulesContent = z.infer<typeof RulesContentSchema>
