import { DEMO_LIVE_COOKIE, DEMO_PERSONA_COOKIE, type DemoPersonaId } from '~~/data/demo/personas'
import { can as canDo, type AccessLevel, type Action, type PermissionResource, type Viewer } from '#shared/domain/permissions'

export interface ViewerState {
  level: AccessLevel
  memberId: string | null
  displayName: string | null
  demo: {
    persona: DemoPersonaId | null
    personas: { id: string, label: string }[]
    simulateLive: boolean
  } | null
}

/** Wird vom Plugin `viewer` vor dem Rendern jeder Seite befüllt. */
export const useViewerState = () => useState<ViewerState | null>('viewer', () => null)

/**
 * Aktueller Betrachter auf Client-Seite. Die UI nutzt `can()` nur zum Ein-/Ausblenden –
 * verbindlich prüft immer der Server.
 */
export function useViewer() {
  const state = useViewerState()

  const viewer = computed<Viewer>(() => ({
    level: state.value?.level ?? 'visitor',
    memberId: state.value?.memberId ?? null,
  }))

  function can(action: Action, resource?: PermissionResource) {
    return canDo(viewer.value, action, resource)
  }

  async function refresh() {
    state.value = await $fetch<ViewerState>('/api/me')
  }

  // Klartext statt JSON-Kodierung (Nuxt-Standard), damit der Server die Werte direkt lesen kann
  const plain = { sameSite: 'lax', path: '/', encode: (value: string) => value, decode: (value: string) => value } as const
  const personaCookie = useCookie<string | null>(DEMO_PERSONA_COOKIE, plain)
  const liveCookie = useCookie<string | null>(DEMO_LIVE_COOKIE, plain)

  /** Demo: Ansicht wechseln und alle Daten der Seite neu laden */
  async function setPersona(persona: DemoPersonaId) {
    personaCookie.value = persona
    await nextTick()
    await refresh()
    await refreshNuxtData()
  }

  async function setSimulateLive(enabled: boolean) {
    liveCookie.value = enabled ? '1' : null
    await nextTick()
    await refresh()
    await refreshNuxtData()
  }

  return {
    viewer,
    displayName: computed(() => state.value?.displayName ?? null),
    demo: computed(() => state.value?.demo ?? null),
    can,
    refresh,
    setPersona,
    setSimulateLive,
  }
}
