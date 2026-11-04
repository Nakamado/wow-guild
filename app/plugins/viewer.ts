import type { ViewerState } from '~/composables/useViewer'

/**
 * Lädt den aktuellen Betrachter einmal vor dem ersten Rendern (SSR), damit Seiten
 * Berechtigungen sofort kennen und geschützte Daten direkt mitrendern können.
 * Auf dem Client wird der Zustand aus dem SSR-Payload übernommen.
 */
export default defineNuxtPlugin({
  name: 'viewer',
  async setup() {
    const state = useViewerState()
    if (state.value) return
    try {
      state.value = await useRequestFetch()<ViewerState>('/api/me')
    }
    catch {
      state.value = { level: 'visitor', memberId: null, displayName: null, demo: null }
    }
  },
})
