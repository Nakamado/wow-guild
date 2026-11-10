/** Eigene Benachrichtigungen (neueste 30) und Anzahl ungelesener – nur für Gildenmitglieder */
export default defineEventHandler(async (event) => {
  const viewer = await getViewer(event)
  assertPermission(viewer, 'runs:join')
  const store = useNotificationStore()
  if (!store || !viewer.memberId) return { available: false, unread: 0, items: [] }
  try {
    const [items, unread] = await Promise.all([store.list(viewer.memberId, 30), store.unreadCount(viewer.memberId)])
    return { available: true, unread, items }
  }
  catch (error) {
    // z. B. Migration noch nicht eingespielt – die Glocke bleibt dann einfach leer
    console.warn(`[notifications] Liste für ${viewer.memberId} nicht lesbar: ${error instanceof Error ? error.message : 'unbekannt'}`)
    return { available: false, unread: 0, items: [] }
  }
})
