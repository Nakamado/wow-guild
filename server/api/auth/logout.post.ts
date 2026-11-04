/** Abmelden: Session-Cookie löschen. */
export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig(event).public.demoMode) await clearUserSession(event)
  return { ok: true }
})
