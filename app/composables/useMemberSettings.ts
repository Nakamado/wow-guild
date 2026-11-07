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
  const { can } = useViewer()
  const allowed = computed(() => can('characters:manage'))
  const { data, status } = useProtectedFetchSync<MemberSettingsView>('member-settings', '/api/me/settings', allowed)

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

  return { settings: data, loaded: computed(() => status.value === 'success' || status.value === 'error'), save }
}
