// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: ['@nuxt/eslint', '@nuxt/image', '@nuxt/test-utils/module'],

  // Ordner gruppieren Komponenten fachlich; der Komponentenname trägt selbst schon das Präfix
  // (BaseButton, AppHeader, DungeonCard …), daher kein zusätzliches Pfad-Präfix.
  components: [{ path: '~/components', pathPrefix: false }],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: '%s · Miinyu WoW Forever',
      meta: [
        { name: 'theme-color', content: '#070b1a' },
        { name: 'color-scheme', content: 'dark' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  css: [
    '@fontsource-variable/cinzel/wght.css',
    '@fontsource-variable/cormorant-garamond/wght.css',
    '@fontsource-variable/cormorant-garamond/wght-italic.css',
    '@fontsource-variable/inter/wght.css',
    '~/assets/scss/main.scss',
  ],

  /**
   * Runtime Config
   * - Alles außerhalb von `public` existiert nur auf dem Server.
   * - Werte werden zur Laufzeit über NUXT_* bzw. NUXT_PUBLIC_* Umgebungsvariablen überschrieben
   *   (siehe .env.example).
   */
  runtimeConfig: {
    // Wird ab Phase 6 von nuxt-auth-utils genutzt (NUXT_SESSION_PASSWORD)
    session: { password: '' },
    discord: {
      clientId: '',
      clientSecret: '',
      botToken: '',
      guildId: '723275162971275335',
      memberRoleId: '',
      adminRoleId: '',
    },
    twitch: {
      clientId: '',
      clientSecret: '',
    },
    supabase: {
      url: '',
      serviceRoleKey: '',
    },
    public: {
      siteUrl: 'http://localhost:3000',
      demoMode: true,
      guild: {
        name: 'Gildenname folgt',
        realm: 'Realm folgt',
        faction: 'alliance',
        discordInvite: 'https://discord.gg/tWnAgUK',
      },
      twitch: {
        channel: 'miinyu',
        broadcasterId: '114422810',
      },
    },
  },

  routeRules: {
    '/impressum': { prerender: true },
    '/datenschutz': { prerender: true },
    '/regeln': { prerender: true },
  },
  compatibilityDate: '2026-11-04',

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Nur `abstracts` (Variablen, Funktionen, Mixins) wird injiziert – erzeugt kein CSS.
          additionalData: '@use "~/assets/scss/abstracts" as *;\n',
        },
      },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // explizit über `pnpm typecheck`, damit der Dev-Server schnell bleibt
  },

  eslint: {
    // ESLint übernimmt auch die Formatierung (kein zusätzlicher Prettier)
    config: { stylistic: true },
  },
})
