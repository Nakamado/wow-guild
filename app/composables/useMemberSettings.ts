import { fail, ok, type DomainResult } from '#shared/domain/result'
import type { MemberSettingsPatch } from '#shared/schemas/member-settings'

export interface MemberSettingsView {
  /** false im Demo-Modus oder ohne Datenbank */
  available: boolean
  isStreamer: boolean
  leaderboardOptIn: boolean
  /** vom Hauptadmin mit deiner Zustimmung freigegebene Charaktere */
  grantedCharacterIds: string[]
  twitchLogin: string | null
}

/** Eigene Einstellungen (Rangliste, Twitch-Kanal) – nur für Gildenmitglieder */
export function useMemberSettings() {
  const { can, viewer } = useViewer()
  // eigenes Konto als Ressource – ohne ownerId wäre das nur für Admins erlaubt
  const allowed = computed(() => can('characters:manage', { ownerId: viewer.value.memberId ?? undefined }))
  const { data, status, error, refresh } = useProtectedFetchSync<MemberSettingsView>('member-settings', '/api/me/settings', allowed)

  async function save(patch: MemberSettingsPatch): Promise<DomainResult<MemberSettingsView>> {
    try {
      const next = await $fetch<MemberSettingsView>('/api/me/settings', { method: 'PATCH', body: patch })
      data.value = next
      return ok(next)
    }
    catch (error) {
      const body = error as { data?: { message?: string }, statusCode?: number }
      if (body.statusCode === 401) return fail('unauthorized', 'Bitte melde dich erneut mit Discord an.')
      return fail('request-failed', body.data?.message ?? 'Das hat leider nicht geklappt. Bitte versuche es später erneut.')
    }
  }

  return {
    settings: data,
    loaded: computed(() => status.value === 'success' || status.value === 'error'),
    /** Laden fehlgeschlagen – ohne Hinweis wäre das Häkchen nur still gesperrt */
    loadError: computed(() => (error.value ? (error.value.data as { message?: string } | undefined)?.message ?? 'Deine Einstellungen konnten nicht geladen werden.' : null)),
    refresh,
    save,
  }
}
