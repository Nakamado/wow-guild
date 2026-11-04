import type { GroupRun } from '#shared/types'
import { GroupRunSchema } from '#shared/schemas/groups'

/**
 * Stellt Demo-Änderungen an Gruppen aus dem sessionStorage wieder her – erst NACH der
 * Hydration, damit Server- und Client-HTML übereinstimmen. Ungültige Einträge werden verworfen.
 */
export default defineNuxtPlugin({
  name: 'demo-runs',
  setup(nuxtApp) {
    if (!useSiteConfig().isDemo) return
    nuxtApp.hook('app:suspense:resolve', () => {
      try {
        const raw = sessionStorage.getItem(DEMO_RUNS_STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as Record<string, unknown>
        const valid: Record<string, GroupRun> = {}
        for (const [id, value] of Object.entries(parsed)) {
          const result = GroupRunSchema.safeParse(value)
          if (result.success && result.data.id === id) valid[id] = result.data
        }
        useDemoRunOverrides().value = valid
      }
      catch {
        sessionStorage.removeItem(DEMO_RUNS_STORAGE_KEY)
      }
    })
  },
})
