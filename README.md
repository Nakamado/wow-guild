# Miinyu WoW Forever – Gildenwebseite

Community- und Gildenwebseite für die **WoW: Forever**-Gilde rund um die Twitch-Streamerin
[Miinyu](https://www.twitch.tv/miinyu). Mit Gildeninfos, Mitglieder- und Charakterübersicht, Dungeon-Finder samt
Gruppenplaner, Eventkalender und Twitch-Integration.

> **Status:** Phase 6 – Integrationen (Discord-Login & Rollen, Mitgliederliste per Bot, Scheduled Events, Twitch Helix,
> Supabase mit atomarer Anmeldung, Charakter-Onboarding & Einstellungen).
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
- werden Änderungen am Gruppenplaner (erstellen, beitreten, absagen …) nur im `sessionStorage` des Browser-Tabs
  gehalten und laufen durch dieselben Geschäftsregeln wie später auf dem Server,
- gibt es oben eine **Demo-Steuerung**: „Ansicht als“ Besucher, Mitglied, Organisator oder Admin (statt echtem
  Discord-Login) und „Live simulieren“ für den Twitch-Livestatus. Beides wird per Cookie gemerkt.

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
| Session | `NUXT_APP_SECRET` | nur Server |
| Discord | `NUXT_DISCORD_CLIENT_ID/SECRET`, `…_GUILD_ID`, `…_MEMBER_ROLE_ID`, `…_ADMIN_ROLE_ID`, `…_BOT_TOKEN` | nur Server |
| Twitch | `NUXT_TWITCH_CLIENT_ID/SECRET`, `NUXT_PUBLIC_TWITCH_CHANNEL`, `…_BROADCASTER_ID` | gemischt |
| Supabase | `NUXT_SUPABASE_URL`, `NUXT_SUPABASE_SERVICE_ROLE_KEY` | nur Server |

Die Werte werden über die [Nuxt Runtime Config](https://nuxt.com/docs/guide/going-further/runtime-config) zur
Laufzeit eingelesen. Nur Werte mit `NUXT_PUBLIC_`-Präfix gelangen in den Browser.

### Live-Betrieb einschalten

`NUXT_PUBLIC_DEMO_MODE=false` setzen. Jede Quelle schaltet nur live, wenn ihre Zugangsdaten vollständig sind; sonst
bleibt sie bei Demo-Daten und das Server-Log nennt die fehlenden Variablen. Für Logins wird zusätzlich
`NUXT_APP_SECRET` gebraucht (versiegelt die Session-Cookies, z. B. `openssl rand -base64 32`; lokal erzeugt Nuxt
ihn automatisch).

### Discord-Einrichtung (Login, Rollen, Bot)

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **OAuth2** → Client ID und Client Secret nach `NUXT_DISCORD_CLIENT_ID` / `NUXT_DISCORD_CLIENT_SECRET`.
   Unter **Redirects** eintragen: `<SITE_URL>/auth/discord` (lokal `http://localhost:3000/auth/discord`,
   später zusätzlich die Vercel-Domain). `NUXT_PUBLIC_SITE_URL` muss exakt dazu passen.
3. **Bot** → Token erzeugen → `NUXT_DISCORD_BOT_TOKEN`. Unter *Privileged Gateway Intents* den
   **Server Members Intent** aktivieren (sonst liefert Discord keine Mitgliederliste).
4. Bot auf den Server einladen: **OAuth2 → URL Generator**, Scope `bot`, keine Berechtigungen nötig
   (Lesen von Mitgliedern und Events reicht). Für Scheduled Events braucht der Bot nur Sichtbarkeit auf den Server.
5. Rollen-IDs (Discord: *Einstellungen → Erweitert → Entwicklermodus*, dann Rechtsklick auf die Rolle →
   *ID kopieren*): Rolle „WoW Forever“ → `NUXT_DISCORD_MEMBER_ROLE_ID`, Admin-/Event-Moderator-Rolle →
   `NUXT_DISCORD_ADMIN_ROLE_ID`.
6. Optional: Discord-User-IDs von Personen, die auf der Seite immer Admin sein sollen (z. B. Betreiber),
   kommagetrennt in `NUXT_ADMIN_USER_IDS`. Sie brauchen dafür keine Discord-Rolle.

Ablauf: Login mit Scopes `identify` + `guilds.members.read`, danach liest die Seite die eigenen Rollen auf dem
Gilden-Server und speichert sie (nur serverseitig lesbar) in der versiegelten Session. Das Discord-Token wird
nicht gespeichert. Rollen werden spätestens alle 10 Minuten per Bot nachgeprüft – wer die Rolle verliert, verliert
damit die Mitgliedsrechte. Die Mitgliederliste zeigt nur Träger der Rolle „WoW Forever“.

### Twitch-Integration

1. [Twitch Developer Console](https://dev.twitch.tv/console/apps) → **Register Your Application**
   (OAuth Redirect `http://localhost`, Kategorie *Website Integration*, Client-Typ *Confidential*).
2. Client ID und Secret nach `NUXT_TWITCH_CLIENT_ID` / `NUXT_TWITCH_CLIENT_SECRET`.
3. `NUXT_PUBLIC_TWITCH_BROADCASTER_ID` ist Miinyus Twitch-User-ID (voreingestellt).

Die Seite nutzt ein App-Token (kein Login nötig): Livestatus wird 60 Sekunden, Clips 15 Minuten zwischengespeichert.
Weitere Gilden-Streamer stehen in `content/streamers.ts` (Twitch-Login, optional Discord-ID für die
Zuordnung zum Mitglied).

### Datenbank-Setup (Supabase)

1. Projekt auf [supabase.com](https://supabase.com) anlegen (Region EU, z. B. Frankfurt).
2. **SQL Editor** → jede Datei aus `supabase/migrations/` **einmal und in Reihenfolge** (nach Dateiname)
   ausführen (oder mit der Supabase-CLI: `supabase db push`). Neue Dateien in späteren Updates ebenso.
3. **Project Settings → API**: Projekt-URL → `NUXT_SUPABASE_URL`, `service_role`-Key →
   `NUXT_SUPABASE_SERVICE_ROLE_KEY`. Der Key bleibt auf dem Server und darf nie im Client landen.

Schema: `characters`, `runs`, `run_participants` (eindeutig je Run und Mitglied bzw. Charakter). RLS ist aktiv,
ohne Policies für `anon` – gelesen und geschrieben wird nur über Nitro. Anmeldungen laufen über die
Postgres-Funktion `join_run()`, die den Run per `SELECT … FOR UPDATE` sperrt und Plätze je Rolle prüft:
Zwei gleichzeitige Anmeldungen auf den letzten Platz können so nicht beide durchkommen. `leave_run()` lässt die
nächste Person derselben Rolle von der Warteliste nachrücken. Die Migration wird in den Unit-Tests mit PGlite
(eingebettetes Postgres) geprüft.

## Projektstruktur

```text
app/
├── assets/scss/   # abstracts (injiziert), tokens, base, layout
├── components/    # base/, layout/ … (ohne Pfad-Präfix auto-importiert)
├── composables/   # z. B. useSiteConfig
├── layouts/
├── pages/
└── utils/
server/
├── providers/     # austauschbare Datenquellen: types, registry, demo/, static/
└── utils/         # z. B. useProviders()
shared/            # von app/ und server/ gemeinsam genutzt (Alias #shared)
├── schemas/       # Zod-Schemas (Laufzeitvalidierung)
├── types/         # daraus abgeleitete TypeScript-Typen
├── data/          # Klassen, Völker, Rollen, Dungeons – mit Quellenangaben
├── domain/        # reine Geschäftslogik (Anmeldung, Levelprüfung, Rechte, Kalender …)
└── utils/         # z. B. Datumsformatierung (Europe/Berlin)
data/demo/         # eindeutig fiktive Demo-Daten (relativ zum aktuellen Datum) und Demo-Personas
content/           # redaktionelle Texte: guild.ts (Gildentexte), rules.ts (Regeln) – per Schema geprüft
tests/
├── unit/          # reine Logik (Node)
├── nuxt/          # Komponenten/Composables (Nuxt-Umgebung)
└── e2e/           # Playwright
docs/PLAN.md
```

### Datenarchitektur

```text
UI ──► composables ──► server/api ──► useProviders() ──► Demo | Live (Discord, Twitch, Supabase)
                                         ▲
                     shared/domain (reine Regeln, in Demo und Live identisch)
```

- Jede Datenquelle hat ein Interface (`server/providers/types.ts`). Die Registry wählt je Quelle Demo oder
  Live – fehlende Zugangsdaten betreffen nur die jeweilige Quelle. Beim Start wird protokolliert, welche
  Quelle aktiv ist (nur Variablennamen, nie Werte).
- Klassen, Völker und Dungeons sind **Daten**, keine Enums, und verweisen per `sourceIds` auf
  `shared/data/sources.ts`. Neue Forever-Inhalte = neuer Datensatz.
- Geschäftsregeln (`shared/domain/`) sind reine Funktionen und vollständig unit-getestet.

### Gruppenplaner

- Katalog: `/dungeons` (Suche, Stufe, passender eigener Charakter, nur mit Gruppen), Detail: `/dungeons/<slug>`.
- Gruppen: `/gruppen` (Filter nach Dungeon, Zeitraum, freien Plätzen), Detail: `/gruppen/<id>`.
- Regeln (`shared/domain/runs.ts`): nur Gildenmitglieder, ein Platz pro Person, Rolle muss zu Klasse und
  Charakter passen, Mindeststufe blockiert, Levelbereich wird als Hinweis erklärt, volle Rollen → Warteliste
  (falls erlaubt), Nachrücken beim Abmelden. Bearbeiten/Absagen nur Organisation oder Admin.
- Datum und Uhrzeit werden in Europe/Berlin eingegeben und als UTC gespeichert.

### Eventkalender

- `/kalender` mit Monats- und Listenansicht, Filter nach Art (Dungeon, Raid, Community) und „Abgesagte zeigen“.
  Monat, Ansicht, Filter und gewählter Tag stehen in der URL.
- Quellen: Discord Scheduled Events (führend für Community-Events) und Runs dieser Seite (führend für
  Dungeons/Raids). Per Bot angekündigte Runs erscheinen nur einmal (`discordEventId`).
- Tage werden in Europe/Berlin zugeordnet (ein Event um 0:30 Uhr gehört zum neuen Tag).
- Raids (`shared/data/raids.ts`): The Barrow Deeps (10), Hyjal Summit (20), Onyxias Hort (40) – Stufe 60,
  öffnen am 09.12.2026. Besetzung je Raid frei einstellbar, Warteliste optional.

### Inhalte bearbeiten

Gildentexte und Regeln stehen in `content/guild.ts` und `content/rules.ts`. Einfach die Texte ändern; Tests prüfen
die Struktur. Solange `isDraft` bzw. `isExample` auf `true` steht, zeigt die Seite einen Hinweis, dass es sich um
Platzhalter handelt.

### Datenschutz & Berechtigungen

- Mitgliederliste, Profile und Charaktere liefert der Server nur an Gildenmitglieder (`requirePermission`).
- Organisatoren-Namen im Kalender und Streamer-Zuordnungen werden für Besucher entfernt.
- Twitch-Clips werden erst nach Klick geladen (2-Klick-Lösung).
- Schreibende Endpunkte prüfen Herkunft, Anmeldung, Berechtigung und Fachregeln auf dem Server; im Demo-Modus
  antworten sie mit 409 (die Demo speichert im Browser).

### Charaktere

- Nach dem ersten Login fragt ein Dialog nach dem Hauptcharakter (Name, Fraktion, Volk, Klasse, Stufe, Rollen).
  „Später“ blendet ihn für die Sitzung aus.
- `/einstellungen`: Twinks hinzufügen, bearbeiten, Hauptcharakter wechseln, löschen (nicht bei offenen
  Anmeldungen). Volk, Klasse und Rollen werden gegen `shared/data` geprüft (`checkCharacterInput`).
- Demo: Ansicht „Neues Mitglied“ zeigt das Onboarding; Änderungen bleiben im Browser-Tab.
- Blizzard-API: nur ein Stub (`server/providers/blizzard/`), da Forever-Unterstützung nicht belegt ist.

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
