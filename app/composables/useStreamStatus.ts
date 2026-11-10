import type { StreamStatus } from '#shared/types'

/** Wie oft der Livestatus nachgeladen wird (serverseitig ohnehin zwischengespeichert) */
export const STREAM_STATUS_POLL_MS = 150_000

/**
 * Livestatus von Miinyu – geteilt von Startseite und Live-Hinweis im Header.
 * Nur im Browser geladen (Seiten bleiben cachebar); im Zweifel gilt „nicht live“.
 */
export function useStreamStatus() {
  const { data: status, refresh } = useFetch<StreamStatus>('/api/twitch/status', { key: 'twitch-status', server: false, lazy: true })
  const isLive = computed(() => status.value?.isLive === true)
  return { status, isLive, refresh }
}
