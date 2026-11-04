import { demoPersonas } from '../../data/demo/personas'

/** Aktueller Betrachter (Zugriffsstufe, Mitglied) und Demo-Steuerung. */
export default defineEventHandler(async (event) => {
  const viewer = getViewer(event)
  const member = viewer.memberId ? await useProviders().members.getMember(viewer.memberId) : null
  const demoMode = Boolean(useRuntimeConfig(event).public.demoMode)

  return {
    level: viewer.level,
    memberId: viewer.memberId,
    displayName: member?.displayName ?? null,
    demo: demoMode
      ? {
          persona: viewer.persona,
          personas: Object.entries(demoPersonas).map(([id, persona]) => ({ id, label: persona.label })),
          simulateLive: isDemoLiveSimulated(event),
        }
      : null,
  }
})
