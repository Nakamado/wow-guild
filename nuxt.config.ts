// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: ['@nuxt/eslint', '@nuxt/image', '@nuxt/test-utils/module', 'nuxt-auth-utils'],

  // Ordner gruppieren Komponenten fachlich; der Komponentenname trägt selbst schon das Präfix
  // (BaseButton, AppHeader, DungeonCard …), daher kein zusätzliches Pfad-Präfix.
  components: [{ path: '~/components', pathPrefix: false }],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: '%s · MukiMuki – Miinyus WoW-Forever-Gilde',
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
    // Login-Session (nuxt-auth-utils). Versiegelt mit NUXT_APP_SECRET (im Dev automatisch erzeugt).
    session: { maxAge: 60 * 60 * 24 * 7 },
    // Discord-User-IDs (kommagetrennt) mit Admin-Rechten auf der Seite, unabhängig von Discord-Rollen
    adminUserIds: '',
    discord: {
      clientId: '',
      clientSecret: '',
      botToken: '',
      guildId: '723275162971275335',
      memberRoleId: '',
      adminRoleId: '',
    },
    // Blizzard Battle.net (WoW: Forever) – vorerst nur für die API-Probe der Gildenleitung
    blizzard: {
      clientId: '',
      clientSecret: '',
      region: 'eu',
      /** Gilden-Slug in der Blizzard-API (noch offen) */
      guildSlug: '',
      /** Testlauf Rangliste: Charaktere (kommagetrennt, „Vorname Nachname“), die live direkt aus der API kommen */
      previewCharacters: '',
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
        name: 'MukiMuki',
        // WoW: Forever hat keine Realms, sondern Regelsätze (PvE, PvP, RP …)
        realm: 'PvE',
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
    // Grundlegende Sicherheits-Header für alle Antworten
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'SAMEORIGIN',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      },
    },
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

  // Der Betrachter kommt aus /api/me (viewer-Plugin), nicht aus der Client-Session von nuxt-auth-utils
  auth: { loadStrategy: 'none' },

  eslint: {
    // ESLint übernimmt auch die Formatierung (kein zusätzlicher Prettier)
    config: { stylistic: true },
  },

  // Externe Bilder über den eigenen Server/Hoster ausliefern (Datenschutz: kein direkter Kontakt zu Discord/Twitch,
  // besonders Twitch-Vorschaubilder vor der 2-Klick-Zustimmung)
  image: {
    domains: ['cdn.discordapp.com', 'static-cdn.jtvnw.net', 'clips-media-assets2.twitch.tv'],
  },
})
