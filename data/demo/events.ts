import type { DiscordEvent } from '../../shared/types'
import { at } from './time'

/**
 * EINDEUTIG FIKTIVE Discord Scheduled Events.
 * `demo-event-03` ist die Discord-Ankündigung von `demo-run-03` und wird im Kalender
 * dedupliziert – so lässt sich die Zusammenführung in der Demo nachvollziehen.
 */
export function createDemoDiscordEvents(now: Date): DiscordEvent[] {
  const event = (input: Omit<DiscordEvent, 'url' | 'endsAt'> & { endsAt?: string | null }): DiscordEvent => ({
    url: null,
    endsAt: null,
    ...input,
  })

  return [
    event({
      id: 'demo-event-01',
      title: 'Gildentreffen in Eisenschmiede',
      description: 'Wir lernen uns kennen, quatschen über Pläne und machen ein Gruppenfoto.',
      startsAt: at(now, 2, 19),
      endsAt: at(now, 2, 21),
      status: 'scheduled',
      organizerName: 'Frostblüte',
    }),
    event({
      id: 'demo-event-02',
      title: 'Angelwettbewerb',
      description: 'Wer fängt den größten Fisch? Kleine Preise aus der Gildenbank.',
      startsAt: at(now, 4, 18),
      status: 'scheduled',
      organizerName: 'Teepause',
    }),
    event({
      id: 'demo-event-03',
      title: 'Hall of Thanes – Gilden-Run',
      description: 'Ankündigung des Runs von der Webseite.',
      startsAt: at(now, 3, 19),
      status: 'scheduled',
      organizerName: 'Frostblüte',
    }),
    event({
      id: 'demo-event-04',
      title: 'Community-Abend',
      description: 'Gemeinsam den Stream schauen und den nächsten Raid planen.',
      startsAt: at(now, 8, 19),
      status: 'scheduled',
      organizerName: null,
    }),
    event({
      id: 'demo-event-05',
      title: 'Rätselabend',
      description: 'Abgesagt – wird nachgeholt.',
      startsAt: at(now, 1, 19),
      status: 'cancelled',
      organizerName: 'Laternchen',
    }),
  ]
}
