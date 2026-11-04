# Miinyu WoW Forever – Gildenwebseite

Community- und Gildenwebseite für die **WoW: Forever**-Gilde rund um die Twitch-Streamerin
[Miinyu](https://www.twitch.tv/miinyu). Mit Gildeninfos, Mitglieder- und Charakterübersicht, Dungeon-Finder samt
Gruppenplaner, Eventkalender und Twitch-Integration.

> **Status:** Phase 1 – Fundament (Projektgerüst, Designsystem, Layout).
> Architektur, Entscheidungen und Roadmap: [`docs/PLAN.md`](docs/PLAN.md)

## Tech-Stack

- [Nuxt 4](https://nuxt.com) · Vue 3 (`<script setup>`) · TypeScript (strict)
- SCSS mit BEM und CSS Custom Properties – **keine CSS-Frameworks**
- Schriften selbst gehostet über Fontsource (Cinzel, Cormorant Garamond, Inter)
- Vitest + `@nuxt/test-utils`, Playwright
- ESLint (inkl. Formatierung) und Stylelint (inkl. BEM-Prüfung)
- Geplant: Supabase, Discord OAuth2, Twitch Helix

## Voraussetzungen

- Node.js **≥ 22**
- pnpm **10** (`corepack enable` aktiviert die in `package.json` festgelegte Version)

## Installation & lokaler Start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Es werden **keine Zugangsdaten** benötigt – die Seite startet im Demo-Modus.

## Demo-Modus

Solange `NUXT_PUBLIC_DEMO_MODE=true` (Standard) gesetzt ist,

- zeigt die Seite ausschließlich **eindeutig fiktive** Beispieldaten,
- ist oben ein Demo-Banner sichtbar,
- werden simulierte Änderungen nur im `sessionStorage` des Browsers gehalten (ab Phase 4).

Fehlen einzelne Zugangsdaten im Live-Modus, fällt nur der betroffene Provider auf Demo-Daten zurück.

## Konfiguration

Alle Werte stehen in [`.env.example`](.env.example). Für lokale Anpassungen:

```bash
cp .env.example .env
```

| Bereich | Variablen | Sichtbarkeit |
|---|---|---|
| Allgemein | `NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_DEMO_MODE` | öffentlich |
| Gilde | `NUXT_PUBLIC_GUILD_NAME`, `…_REALM`, `…_FACTION`, `…_DISCORD_INVITE` | öffentlich |
| Session | `NUXT_SESSION_PASSWORD` | nur Server |
| Discord | `NUXT_DISCORD_CLIENT_ID/SECRET`, `…_GUILD_ID`, `…_MEMBER_ROLE_ID`, `…_ADMIN_ROLE_ID`, `…_BOT_TOKEN` | nur Server |
| Twitch | `NUXT_TWITCH_CLIENT_ID/SECRET`, `NUXT_PUBLIC_TWITCH_CHANNEL`, `…_BROADCASTER_ID` | gemischt |
| Supabase | `NUXT_SUPABASE_URL`, `NUXT_SUPABASE_SERVICE_ROLE_KEY` | nur Server |

Die Werte werden über die [Nuxt Runtime Config](https://nuxt.com/docs/guide/going-further/runtime-config) zur
Laufzeit eingelesen. Nur Werte mit `NUXT_PUBLIC_`-Präfix gelangen in den Browser.

### Discord-OAuth-Einrichtung

_Folgt in Phase 6._ Vorgesehen: Scopes `identify` + `guilds.members.read`, Redirect-URL `<SITE_URL>/auth/discord`,
Gildenmitgliedschaft über die Discord-Rolle „WoW Forever“.

### Twitch-Integration

_Folgt in Phase 3 (Demo) und Phase 6 (Helix API)._

### Datenbank-Setup

_Folgt in Phase 6_ (Supabase-Migrationen unter `supabase/migrations/`).

## Projektstruktur

```text
app/
├── assets/scss/   # abstracts (injiziert), tokens, base, layout
├── components/    # base/, layout/ … (ohne Pfad-Präfix auto-importiert)
├── composables/   # z. B. useSiteConfig
├── layouts/
├── pages/
└── utils/
tests/
├── unit/          # reine Logik (Node)
├── nuxt/          # Komponenten/Composables (Nuxt-Umgebung)
└── e2e/           # Playwright
docs/PLAN.md
```

### CSS-Konventionen

- Komponentenstyles in `<style scoped lang="scss">`, Klassen nach **BEM** (`block__element--modifier`).
- `abstracts/` (Breakpoints, `rem()`, Mixins) wird automatisch in jede SCSS-Datei injiziert und erzeugt kein CSS.
- Farben, Typografie, Abstände usw. ausschließlich über Custom Properties aus `tokens/`.
- `@use`/`@forward` statt `@import`, kein `!important`, flache Verschachtelung.
- Stylelint prüft BEM-Klassennamen automatisch.

Eine Übersicht aller Tokens und Basiskomponenten liegt unter **`/styleguide`** (nicht verlinkt, `noindex`).

## Skripte

| Befehl | Zweck |
|---|---|
| `pnpm dev` | Entwicklungsserver |
| `pnpm build` / `pnpm preview` | Produktions-Build lokal testen |
| `pnpm typecheck` | TypeScript-Prüfung (vue-tsc) |
| `pnpm lint` / `pnpm lint:fix` | ESLint + Stylelint |
| `pnpm test` | Unit- und Komponententests (Vitest) |
| `pnpm test:e2e` | End-to-End-Tests (Playwright, baut die App) |

Für Playwright einmalig die Browser installieren: `pnpm exec playwright install chromium`.

## Deployment auf Vercel

_Ausführliche Anleitung folgt in Phase 7._ Kurzfassung: Repository in Vercel importieren (Framework-Preset „Nuxt“
wird erkannt), Umgebungsvariablen aus `.env.example` im Vercel-Dashboard hinterlegen, deployen.

## Rechtliches

Nicht-kommerzielles Fanprojekt. World of Warcraft ist eine Marke von Blizzard Entertainment, Inc. Diese Seite steht
in keiner Verbindung zu Blizzard Entertainment, Discord oder Twitch. Branding-Assets von Miinyu werden nur mit ihrer
Freigabe verwendet.
