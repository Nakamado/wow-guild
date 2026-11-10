import type { AppNotification, NotificationList } from '#shared/types'
import { createDemoNotifications } from '~~/data/demo/notifications'

/** Wie oft die Glocke nachschaut (nur bei sichtbarem Tab) */
export const NOTIFICATION_POLL_MS = 60_000

/**
 * Benachrichtigungen für die Glocke. Live: vom Server (nur Gildenmitglieder), regelmäßig
 * nachgeladen. Demo: Beispiel-Einträge im Browser – „gelesen“ gilt nur bis zum Neuladen.
 */
export function useNotifications() {
  const { isDemo } = useSiteConfig()
  const { can } = useViewer()
  const allowed = computed(() => can('runs:join'))
  const items = useState<AppNotification[]>('notifications', () => [])
  const available = useState('notifications-available', () => false)
  const loaded = useState('notifications-loaded', () => false)

  const unread = computed(() => items.value.filter(item => !item.readAt).length)

  async function load() {
    if (!allowed.value) {
      items.value = []
      loaded.value = false
      return
    }
    if (isDemo) {
      if (!loaded.value) items.value = createDemoNotifications(new Date())
      available.value = true
      loaded.value = true
      return
    }
    try {
      const result = await $fetch<NotificationList>('/api/me/notifications')
      items.value = result.items
      available.value = result.available
      loaded.value = true
    }
    catch {
      // still bleiben – die Glocke ist ein Extra, kein Grund für Fehlermeldungen
    }
  }

  async function markAllRead() {
    if (!unread.value) return
    const now = new Date().toISOString()
    items.value = items.value.map(item => (item.readAt ? item : { ...item, readAt: now }))
    if (isDemo) return
    try {
      await $fetch<null>('/api/me/notifications/read', { method: 'POST', body: {} })
    }
    catch {
      // beim nächsten Laden kommt der echte Stand zurück
    }
  }

  return { allowed, items, unread, available, loaded, load, markAllRead }
}
