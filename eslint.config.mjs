// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['playwright-report/**', 'test-results/**'],
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off', // Seiten wie index.vue / gilde.vue
    },
  },
)
