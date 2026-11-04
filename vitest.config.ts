import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      // Reine Logik (shared/, Provider-Registry) – schnell, ohne Nuxt-Umgebung
      {
        resolve: {
          alias: {
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
          },
        },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      // Komponenten & Composables in einer echten Nuxt-Laufzeitumgebung
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/nuxt/**/*.test.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: { domEnvironment: 'happy-dom' },
          },
        },
      }),
    ],
  },
})
