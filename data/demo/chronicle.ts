import type { GuildMilestone } from '../../shared/schemas/chronicle'

/**
 * FIKTIVE Beispiel-Meilensteine für die Gilden-Chronik – keine echten Ereignisse, keine Spielernamen.
 * Nur im Demo-Modus sichtbar.
 */
export const exampleMilestones: GuildMilestone[] = [
  {
    id: 'beispiel-gruendung',
    type: 'guild.founded',
    title: 'Die Gilde wurde gegründet',
    description: 'Aus Miinyus Community entsteht eine Gilde für WoW: Forever – der Anfang unserer gemeinsamen Geschichte.',
    category: 'community',
    source: 'manual',
    occurredAt: '2026-11-01',
    icon: 'sparkle',
    highlight: true,
    isDemo: true,
  },
  {
    id: 'beispiel-10-mitglieder',
    type: 'members.threshold',
    title: '10 Mitglieder erreicht',
    description: 'Zehn Abenteurer tragen das Gildenwappen. Die ersten Gruppen finden sich wie von selbst.',
    category: 'community',
    source: 'blizzard-api',
    occurredAt: null,
    detectedAt: '2026-11-03',
    dedupeKey: 'members.threshold:10',
    icon: 'users',
    isDemo: true,
  },
  {
    id: 'beispiel-erster-dungeon',
    type: 'dungeon.first-group',
    title: 'Erster gemeinsamer Dungeon',
    description: 'Fünf Gildenmitglieder wagen sich zum ersten Mal gemeinsam in einen Dungeon – und kommen alle wieder heraus.',
    category: 'dungeon',
    source: 'addon',
    occurredAt: '2026-11-05',
    icon: 'swords',
    isDemo: true,
  },
  {
    id: 'beispiel-erste-stufe-60',
    type: 'level.first',
    title: 'Erster Charakter auf Stufe 60',
    description: 'Die Höchststufe ist erreicht. Ab jetzt rückt der erste Raid in greifbare Nähe.',
    category: 'achievement',
    source: 'blizzard-api',
    occurredAt: '2026-11-08',
    dedupeKey: 'level.first:60',
    icon: 'star',
    isDemo: true,
  },
  {
    id: 'beispiel-erster-raid',
    type: 'raid.first',
    title: 'Erster gemeinsamer Raid',
    description: 'Gemeinsam betreten wir zum ersten Mal eine Raidinstanz. Ein Abend, über den wir noch lange reden werden.',
    category: 'raid',
    source: 'manual',
    occurredAt: '2026-11-15',
    icon: 'shield',
    highlight: true,
    isDemo: true,
  },
]
