# Projektplan – Miinyu WoW Forever Gildenwebseite

Stand: 04.11.2026 · Status: **Planung freigegeben, Implementierung startet mit Phase 1**

Dieses Dokument fasst Architektur, Entscheidungen und Roadmap zusammen. Es ergänzt den ursprünglichen Projekt-Prompt; bei Widersprüchen gelten die Entscheidungen hier.

---

## 1. Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Framework | **Nuxt 4.x (neueste stabile)** statt Nuxt 3 – Nuxt 3 ist seit 31.07.2026 End of Life. Nuxt-4-Struktur mit `app/`-Verzeichnis. Vorbereitung auf Nuxt 5 über `future.compatibilityVersion`. |
| Paketmanager | pnpm |
| Spiel | **WoW: Forever** (Classic+, Release 04.11.2026). Neue Dungeons/Zonen/Völker → Klassen, Völker, Dungeons als **Daten**, nicht als hartcodierte Enums. |
| Fraktion | **Allianz** |
| Gildenname, Realm | noch offen → konfigurierbare Platzhalter |
| Discord-Server | ID `723275162971275335`, Einladung `https://discord.gg/tWnAgUK` |
| Gildenmitgliedschaft | über die **Discord-Rolle „WoW Forever“** (nicht Channel-basiert). Rollen-ID wird konfiguriert. |
| Mitgliederliste | zeigt **alle Rollenträger**, aber **nur für eingeloggte Gildenmitglieder** sichtbar. Benötigt Discord-Bot mit „Server Members Intent“ (muss Miinyu als Server-Admin hinzufügen). Mitglieder ohne Login erscheinen mit Name/Avatar und Hinweis „noch kein Charakter hinterlegt“. |
| Charaktere | **Selbstpflege durch Mitglieder**: Pflicht-Dialog nach erstem Login für den Hauptcharakter (Name, Klasse, Volk, Level, Rollen). In den **Einstellungen**: Twinks hinzufügen, Charaktere bearbeiten/umbenennen, Level aktualisieren. `CharacterProvider` bleibt austauschbar für eine evtl. spätere Blizzard-API. |
| Blizzard-API | Unterstützung für Forever **unbestätigt** → nur Provider-Stub, keine erfundenen Endpunkte. |
| Twitch | Kanal `miinyu`, Broadcaster-ID `114422810` |
| Impressum/Datenschutz | Verantwortlich: Dustin Clever (Angaben als klar markierte Platzhalter, bis er sie ergänzt) |
| Branding | Siehe Abschnitt 2. Miinyus Modell-Art, Emotes und Panels stammen von Künstlern → **nur mit Miinyus Freigabe** verwenden. Bis dahin nur Farbwelt, Stimmung und Ornamentstil übernehmen, Bildflächen als gekennzeichnete Platzhalter. |
| Pinia | vorerst nicht; `useState` + Composables |
| CSS | SCSS + BEM, keine CSS-Frameworks |

## 2. Designrichtung

Abgeleitet aus Miinyus Twitch-Kanal (Offline-Screen, Panels) und kombiniert mit Epic Fantasy:

- **Thema:** „Ghost Kitsune“ – nächtliche, frostig-magische Stimmung. Symbole 💧 und 🌸.
- **Farben:** tiefes Nachtblau als Fläche, eisblaues Glühen als Akzent, weiß/silberne Frost- und Blüten-Ornamente, warmes Laternenlicht als sparsamer Kontrast. Passt zur Allianz (Blau/Silber).
- **Typografie:** elegante Serif als Display-Schrift (Versalien für große Titel, Kursiv für Akzente/Buttons, wie in Miinyus Panels), gut lesbare Sans für Fließtext. Schriften selbst gehostet (OFL), z. B. Cinzel / Cormorant Garamond + Inter o. ä.
- **Hero:** cinematische Nachtlandschaft (Burg/Berge), schwebende Laternen, leuchtende Blüten, dezenter Parallax, `prefers-reduced-motion` beachten.
- **Unterhalb des Heroes:** dunkles, ruhiges Dashboard mit Cards, feinen Frost-Ornamenten an Rahmen, WoW-Klassenfarben für Badges.
- Keine Blizzard-Assets ohne Nutzungsrechte.

## 3. Architektur

```
UI (pages, components)  ──►  composables (useFetch / $fetch)
                                     │
Nitro server/api  ──►  services (Use Cases, Berechtigungen)
                         ├─► providers   (extern, lesend: Discord, Twitch, Blizzard, Demo)
                         └─► repositories (Persistenz: Supabase | Demo)
shared/  ◄── reine Domain-Logik, Zod-Schemas, Typen (von app und server genutzt)
```

- **Domain-Logik in `shared/domain/`** als reine Funktionen: `canJoinRun()`, `checkLevelFit()`, `computeComposition()`, `mergeEvents()`, `can(user, action, resource)`. Vollständig unit-getestet, im Demo- und Live-Modus identisch.
- **Provider-Registry:** jeder Provider wählt Demo/Live über `runtimeConfig`; fehlende Zugangsdaten → nur dieser Provider fällt auf Demo zurück. Externe Antworten werden mit Zod validiert und normalisiert.
- **Auth:** `nuxt-auth-utils` – versiegelte HttpOnly-Session-Cookies, OAuth-State, Tokens nur serverseitig.
  - Scopes `identify` + `guilds.members.read`; Rollen über `GET /users/@me/guilds/{guild.id}/member`.
  - Rollen mit Zeitstempel in der Session; geschützte Aktionen prüfen neu, wenn älter als ~10 Min.
  - Bot-Token für: Mitgliederliste (`GET /guilds/{id}/members`, Filter auf Rolle), Scheduled Events, später Ankündigungen.
- **Berechtigungsstufen:** Besucher · angemeldeter Discord-Nutzer · Gildenmitglied (Rolle „WoW Forever“) · Admin/Event-Moderator (Admin-Rollen-ID).
- **Supabase nur serverseitig** (Service-Role-Key). RLS aktiv ohne `anon`-Policies; Autorisierung in Nitro, da Identität von Discord kommt.
  - Überbuchungsschutz: Postgres-Funktion `join_run()` mit `SELECT … FOR UPDATE` auf den Run, Kapazitätsprüfung je Rolle, Insert in einer Transaktion.
  - Constraints `UNIQUE(run_id, member_id)`, `UNIQUE(run_id, character_id)`.
- **Demo-Modus:** Vercel-Serverless hat keinen geteilten Speicher → Demo-Schreibzugriffe über clientseitiges `DemoGroupRepository` (sessionStorage) mit derselben Domain-Logik. Sichtbar markierte **Demo-Rollenauswahl** (Besucher / Mitglied / Organisator / Admin) statt echtem Login; Banner „Demo – nichts wird dauerhaft gespeichert“. Charakter-Onboarding wird in der Demo simuliert.
- **Rendering (`routeRules`):** Dungeons & Regeln prerendered; Startseite, Kalender per SWR; Twitch über gecachte Server-Routen (Livestatus 60 s, Clips 15 min); Live-Indikator clientseitig nachgeladen.
- **Kalender:** normalisiertes `CalendarEvent` mit stabiler ID (`discord:<id>`, `site:<uuid>`); per Bot angekündigte Website-Events speichern die Discord-Event-ID als Referenz → keine Duplikate.
- **Zeit:** `timestamptz` (UTC) in der DB, Anzeige Europe/Berlin via `Intl`.
- **Inhalte:** Regeln und Gildentexte über `@nuxt/content` (Markdown), Beispielregeln klar gekennzeichnet.
- **Datenschutz (DE):** Impressum + Datenschutzerklärung; Twitch-Embeds per 2-Klick-Lösung; Schriften selbst gehostet (`@nuxt/fonts`); Mitgliederdaten nur für eingeloggte Mitglieder.

## 4. Ordnerstruktur

```
wow-guild/
├── app/
│   ├── assets/scss/
│   ├── components/
│   │   ├── base/       # BaseButton, BaseCard, BaseDialog, EmptyState, ErrorState, LoadingSkeleton
│   │   ├── layout/     # AppHeader, AppFooter, AppNav, DemoBanner
│   │   ├── home/       # HeroSection, GuildStats
│   │   ├── members/    # MemberCard, CharacterCard, ClassBadge, RoleBadge, MemberFilters, CharacterOnboardingDialog
│   │   ├── dungeons/   # DungeonCard, DungeonFilters
│   │   ├── groups/     # GroupCard, GroupComposition, GroupSignupDialog, GroupForm
│   │   ├── events/     # EventCalendar, EventList, EventDetails
│   │   └── twitch/     # TwitchClipCard, TwitchLiveIndicator, StreamerCard, ConsentEmbed
│   ├── composables/
│   ├── layouts/default.vue
│   ├── pages/          # index, gilde, mitglieder/[id], charaktere/[id], dungeons/[slug], gruppen/[id],
│   │                   # kalender, clips, streamer, regeln, einstellungen, impressum, datenschutz
│   └── app.vue
├── server/
│   ├── api/
│   ├── routes/auth/discord.get.ts
│   ├── services/
│   ├── providers/{demo,discord,twitch,blizzard}/
│   ├── repositories/{supabase,demo}/
│   └── utils/
├── shared/
│   ├── domain/
│   ├── schemas/
│   ├── types/
│   └── data/           # classes, races, roles, dungeons (mit Quellenangabe je Eintrag)
├── content/            # regeln.md, gilde.md
├── data/demo/          # eindeutig fiktive Demo-Daten
├── supabase/migrations/
├── tests/{unit,nuxt,e2e}/
├── public/
├── .env.example  nuxt.config.ts  README.md
```

### SCSS-Architektur (`app/assets/scss/`)

```
├── abstracts/        # erzeugt KEIN CSS → per additionalData in jede Komponente injiziert
│   ├── _breakpoints.scss   # Sass-Map + mq()-Mixin (Custom Properties gehen nicht in Media Queries)
│   ├── _functions.scss     # rem(), z()
│   ├── _mixins.scss        # focus-ring, visually-hidden, card-surface, reduced-motion, ornament-border
│   └── _index.scss
├── tokens/           # CSS Custom Properties in :root
│   ├── _colors.scss  _class-colors.scss  _typography.scss
│   ├── _spacing.scss _radii-shadows.scss _motion.scss  _z-index.scss
│   └── _index.scss
├── base/             # _reset, _typography, _global, _focus
├── layout/           # .container, .section
└── main.scss
```

Nur `abstracts` wird injiziert (`@use "~/assets/scss/abstracts" as *;`). Stylelint mit BEM-Pattern-Regel.

## 5. Roadmap

Je Phase ein Feature-Branch, Conventional Commits, Merge/Push nur nach Freigabe.

| # | Branch | Inhalt |
|---|---|---|
| 1 | `feat/foundation` | Nuxt 4 + TS strict, ESLint/Stylelint, Vitest/Playwright-Setup, SCSS-System & Tokens, Layout/Navigation, Basiskomponenten, DemoBanner, `.env.example`, README-Gerüst, Impressum/Datenschutz |
| 2 | `feat/domain` | Typen & Zod-Schemas, Klassen/Völker/Rollen, Dungeon-Katalog mit Quellen, Demo-Daten, Provider-Registry, Domain-Logik + Unit-Tests |
| 3 | `feat/public-pages` | Hero, Startseite, Gilde, Mitglieder (+ Filter), Charakterprofile, Regeln, Twitch-Demo |
| 4 | `feat/dungeon-finder` | Browser & Filter, Runs erstellen/bearbeiten/absagen, Beitreten/Verlassen, Demo-Rollen, E2E |
| 5 | `feat/calendar` | Monats-/Listenansicht, Filter, Details, Raidgrößen, Warteliste |
| 6 | `feat/integrations` | Discord OAuth & Rollenprüfung, Mitgliederliste per Bot, Charakter-Onboarding & Einstellungen, Scheduled Events, Twitch Helix, Supabase-Schema mit `join_run()`, Blizzard-Stub |
| 7 | `chore/qa` | vue-tsc, Lint, Tests, Responsive, a11y, Lighthouse, README |

## 6. Abhängigkeiten

Versionen: jeweils neueste stabile, per Lockfile fixiert.

- **Runtime:** `nuxt` (4.x), `nuxt-auth-utils`, `@nuxt/content`, `@nuxt/image`, `@nuxt/fonts`, `zod`, `@supabase/supabase-js`
- **Dev:** `typescript`, `vue-tsc`, `sass-embedded`, `@nuxt/eslint`, `eslint`, `stylelint`, `stylelint-config-standard-scss`, `stylelint-selector-bem-pattern`, `vitest`, `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom`, `@playwright/test`, optional `supabase` CLI
- **Nicht:** CSS-Frameworks, Kalender-Libraries, axios, Pinia (vorerst)

## 7. Demo- und Live-Integrationen

| Bereich | Demo | Live |
|---|---|---|
| Login & Rollen | Demo-Rollenauswahl | Discord OAuth2 + `/users/@me/guilds/{id}/member` |
| Mitglieder | fiktive Mitglieder | Bot: `GET /guilds/{id}/members`, gefiltert auf Rolle „WoW Forever“ |
| Charaktere | fiktive Charaktere, simuliertes Onboarding | Selbstpflege (Supabase); optional später Blizzard-Provider |
| Dungeons | statische Daten mit Quellen | gleich, um Forever-Dungeons erweitert |
| Runs/Anmeldungen | sessionStorage | Supabase über Nitro, `join_run()` |
| Discord-Events | fiktive Events | Bot: `GET /guilds/{id}/scheduled-events` |
| Livestatus | umschaltbar simuliert | Helix `GET /streams` (App-Token) |
| Clips | fiktive Clips, Platzhalter-Thumbnails | Helix `GET /clips` mit Zeitraum; Embeds mit `parent`-Domain |
| Weitere Streamer | Konfigurationsdatei | Helix `/users` + `/streams` (gebündelt) |

## 8. Offene Punkte

- Gildenname und Realm
- Discord-Rollen-IDs (Gilde „WoW Forever“, Admin/Moderator)
- Discord-Bot auf Miinyus Server (durch Miinyu als Admin, inkl. Server Members Intent)
- Freigabe von Miinyu für Branding-Assets (Modell-Art, Logo)
- Offizielle Gildenregeln
- Impressums-Angaben (Dustin)

## 9. Anpassungen während der Umsetzung

| Phase | Anpassung | Grund |
|---|---|---|
| 1 | TypeScript 5.9 statt 7.0 | vue-tsc-Kompatibilität mit dem nativen TS 7 nicht belegt |
| 1 | Stylelint 17 statt 18 | `stylelint-selector-bem-pattern` unterstützt 18 noch nicht |
| 1 | Schriften über Fontsource-Pakete statt `@nuxt/fonts` | ebenfalls selbst gehostet, aber deterministisch und ohne Netzabruf beim Build |
| 1 | `@nuxt/content` und `nuxt-auth-utils` erst in Phase 3 bzw. 6 | erst dann benötigt |
| 2 | Erlaubte Klassen hängen am **Volk je Fraktion** | Forever hebt die Fraktionsbindung von Paladin/Schamane auf (z. B. Zwerg-Schamane, Untoter Paladin); Himmelsgeborene gibt es für beide Fraktionen mit unterschiedlichen Klassen |
| 2 | Paladine auch als Tank | Paladine erhalten in Forever eine Spott-Fähigkeit |
| 2 | Levelbereiche aus der Forever-Übersicht, Mindeststufen aus der Classic-Übersicht; neue Forever-Dungeons ohne belegte Mindeststufe (`null`) | keine erfundenen Werte |
| 2 | Warteliste bereits in der Domain-Logik | Teil der Anmelderegeln; die UI folgt mit Kalender/Raids |
| 3 | Gildentexte und Regeln als typisierte Content-Dateien (`content/*.ts`) statt `@nuxt/content` | `@nuxt/content` 3 setzt zod 3 und SQLite voraus; für zwei Seiten unverhältnismäßig. Inhalte bleiben editierbar und werden per Schema geprüft |
| 3 | Betrachter (`/api/me`) wird per Plugin vor dem Rendern geladen | geschützte Daten können so direkt serverseitig gerendert werden |
| 3 | Hero-Illustration als eigenes, prozedurales SVG | keine fremden Assets; austauschbar, sobald Miinyus Artwork freigegeben ist |
| 3 | Zusätzliche Seite `/streamer` | „Weitere Gilden-Streamer“ bekommen eine eigene Übersicht (auf der Startseite als Auszug) |
| 4 | Eigene Seiten `/gruppen` und `/gruppen/<id>` neben `/dungeons` | Gruppen lassen sich dungeonübergreifend nach Datum und freien Plätzen filtern |
| 4 | Teilnehmer werden für Besucher serverseitig anonymisiert (Besetzung bleibt sichtbar) | Datenschutz: nur Gildenmitglieder sehen, wer teilnimmt |
| 4 | Startseite und Kalender zeigen weiterhin die Server-Runs, nicht die lokalen Demo-Änderungen | Kalender-Zusammenführung folgt in Phase 5 |
