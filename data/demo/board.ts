import { dayKeyOf } from '../../shared/utils/calendar'
import type { BoardNote } from '../../shared/types'
import { at } from './time'

/** FIKTIVE Aushänge für das Schwarze Brett (Demo-Modus) – Ablaufdaten relativ zu heute */
export function createDemoBoardNotes(now: Date): BoardNote[] {
  const inDays = (days: number) => dayKeyOf(new Date(now.getTime() + days * 86_400_000))
  const base = { createdBy: 'demo-member-01', isDemo: true }
  return [
    {
      ...base,
      id: 'demo-note-01',
      title: '100 Feuerflossenschnapper für den ersten Raid',
      text: 'Wer angeln mag: Bitte bis Freitag an Frostblüte schicken. Jeder Fisch hilft!',
      expiresOn: inDays(6),
      createdAt: at(now, -1, 17),
      updatedAt: at(now, -1, 17),
    },
    {
      ...base,
      id: 'demo-note-02',
      title: 'Verzauberer für Waffen gesucht',
      text: 'Für die Tanks bräuchten wir „Kreuzfahrer“ – Material stellt die Gilde. Meldet euch bei Frostblüte.',
      expiresOn: null,
      createdAt: at(now, -3, 19),
      updatedAt: at(now, -3, 19),
    },
  ]
}
