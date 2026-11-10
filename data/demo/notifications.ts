import type { AppNotification } from '../../shared/types'

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

/** FIKTIVE Benachrichtigungen für die Glocke im Demo-Modus – relativ zu jetzt */
export function createDemoNotifications(now: Date): AppNotification[] {
  return [
    {
      id: 'demo-note-01',
      kind: 'run-joined',
      runId: 'demo-run-03',
      data: { runTitle: 'Erstbesuch: Halle der Thane', characterName: 'Thorgrimm Ambossfaust', role: 'tank' },
      createdAt: minutesAgo(now, 12),
      readAt: null,
    },
    {
      id: 'demo-note-02',
      kind: 'run-promoted',
      runId: 'demo-run-02',
      data: { runTitle: 'Bibliothek mit Lehrlingen', role: 'healer' },
      createdAt: minutesAgo(now, 95),
      readAt: null,
    },
    {
      id: 'demo-note-03',
      kind: 'run-cancelled',
      runId: 'demo-run-05',
      data: { runTitle: 'Stratholme: Lebend', reason: 'Zu wenig Anmeldungen' },
      createdAt: minutesAgo(now, 60 * 26),
      readAt: minutesAgo(now, 60 * 20),
    },
  ]
}
