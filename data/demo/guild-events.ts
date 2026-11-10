import type { GuildEvent } from '../../shared/types'
import { at } from './time'

/** FIKTIVE Gilden-Events für den Demo-Modus – relativ zu heute */
export function createDemoGuildEvents(now: Date): GuildEvent[] {
  const created = at(now, -2, 17)
  const base = { status: 'scheduled' as const, createdAt: created, updatedAt: created }
  return [
    {
      ...base,
      id: 'demo-gevent-01',
      title: 'Gildenfoto am Tor von Sturmwind',
      description: 'Alle in Gildenwappenrock – danach gemeinsam auf einen Ausritt nach Westfall. Twinks willkommen!',
      startsAt: at(now, 3, 19),
      endsAt: at(now, 3, 21),
      location: 'Sturmwind, Haupttor',
      createdBy: 'demo-member-01',
    },
    {
      ...base,
      id: 'demo-gevent-02',
      title: 'Angelwettbewerb am Loch Modan',
      description: 'Wer fängt den größten Fisch? Preis: 5 Gold von der Gildenbank.',
      startsAt: at(now, 6, 18),
      endsAt: at(now, 6, 19),
      location: 'Loch Modan, Thelsamar-Steg',
      createdBy: 'demo-member-02',
    },
  ]
}
