import { demoPersonas } from '../../data/demo/personas'

/** Aktueller Betrachter (Zugriffsstufe, Mitglied), Login-Status und Demo-Steuerung. */
export default defineEventHandler(async (event) => {
  const viewer = await getViewer(event)
  const config = useRuntimeConfig(event)
  const demoMode = Boolean(config.public.demoMode)

  const member = !viewer.user && viewer.memberId ? await useProviders().members.getMember(viewer.memberId) : null

  return {
    level: viewer.level,
    memberId: viewer.memberId,
    displayName: viewer.user?.displayName ?? member?.displayName ?? null,
    avatarUrl: viewer.user?.avatarUrl ?? member?.avatarUrl ?? null,
    /** Discord-Login ist eingerichtet (nur live) */
    loginAvailable: !demoMode && Boolean(config.discord.clientId && config.discord.clientSecret),
    demo: demoMode
      ? {
          persona: viewer.persona,
          personas: Object.entries(demoPersonas).map(([id, persona]) => ({ id, label: persona.label })),
          simulateLive: isDemoLiveSimulated(event),
        }
      : null,
  }
})
