/**
 * Markiert die Seite als „bereit“, sobald Vue die Hydration abgeschlossen hat.
 * Browser-Tests warten darauf, bevor sie tippen oder klicken (sonst gehen Eingaben verloren).
 */
export default defineNuxtPlugin({
  name: 'hydrated',
  setup(nuxtApp) {
    nuxtApp.hook('app:suspense:resolve', () => {
      document.documentElement.dataset.hydrated = 'true'
    })
  },
})
