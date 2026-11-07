# Miinyu WoW Forever – Gildenwebseite

Community- und Gildenwebseite für die **WoW: Forever**-Gilde rund um die Twitch-Streamerin
[Miinyu](https://www.twitch.tv/miinyu). Mit Gildeninfos, Mitglieder- und Charakterübersicht, Dungeon-Finder samt
Gruppenplaner, Eventkalender und Twitch-Integration.

> **Status:** Phase 7 – Qualitätssicherung abgeschlossen (Tests, Barrierefreiheit, Robustheit, Deployment-Anleitung).
> Alle Funktionen laufen im Demo-Modus; live fehlen nur noch der Discord-Bot auf dem Server und das Vercel-Projekt.
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
| Discord | `NUXT_DISCORD_CLIENT_ID/SECRET`, `…_GUILD_ID`, `…_MEMBER_ROLE_ID`, `…_ADMIN_ROLE_ID`, `…_STREAMER_ROLE_ID`, `…_BOT_TOKEN` | nur Server |
| Twitch | `NUXT_TWITCH_CLIENT_ID/SECRET`, `NUXT_PUBLIC_TWITCH_CHANNEL`, `…_BROADCASTER_ID` | gemischt |
| Supabase | `NUXT_SUPABASE_URL`, `NUXT_SUPABASE_SERVICE_ROLE_KEY` | nur Server |

Die Werte werden über die [Nuxt Runtime Config](https://nuxt.com/docs/guide/going-further/runtime-config) zur
Laufzeit eingelesen. Nur Werte mit `NUXT_PUBLIC_`-Präfix gelangen in den Browser.

### Live-Betrieb einschalten

`NUXT_PUBLIC_DEMO_MODE=false` setzen. Jede Quelle schaltet nur live, wenn ihre Zugangsdaten vollständig sind; sonst
bleibt der Bereich leer (nie Beispieldaten) und das Server-Log nennt die fehlenden Variablen. Für Logins wird zusätzlich
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
   `NUXT_DISCORD_ADMIN_ROLE_ID`, Rolle „Streamer“ → `NUXT_DISCORD_STREAMER_ROLE_ID`.
6. Optional: Discord-User-IDs von Personen, die auf der Seite immer Admin sein sollen (z. B. Betreiber),
   kommagetrennt in `NUXT_ADMIN_USER_IDS`. Sie brauchen dafür keine Discord-Rolle.

Ablauf: Login mit Scopes `identify` + `guilds.members.read`, danach liest die Seite die eigenen Rollen auf dem
Gilden-Server und speichert sie (nur serverseitig lesbar) in der verschlüsselten Session. Rollen werden spätestens
alle 10 Minuten nachgeprüft – per Bot, oder ohne Bot mit dem Discord-Token des Nutzers (Scopes `identify` +
`guilds.members.read`, nur im verschlüsselten Session-Cookie, nie in der Datenbank). Wer die Rolle verliert,
verliert damit die Mitgliedsrechte.

**Mitgliederliste:** Mit Bot zeigt sie alle Träger der Rolle „WoW Forever“. **Ohne Bot** zeigt sie alle, die sich
schon einmal auf der Seite angemeldet haben und die Rolle tragen (Tabelle `members` in Supabase: Discord-ID,
Anzeigename, Avatar, Rollenstand – keine E-Mail). Der Bot ist also optional; ohne ihn fehlen nur die
Discord-Events im Kalender.

**Live-Betrieb ohne Zugangsdaten** für eine Quelle zeigt dort leere Inhalte, niemals Beispieldaten.

### Blizzard-API-Probe (WoW: Forever)

Blizzard hat die Forever-API nicht dokumentiert. Die Seite `/admin/blizzard` (nur Gildenleitung, im Benutzermenü)
testet, welche Endpunkte antworten, und zeigt Status und Feldnamen an – gespeichert wird nichts.

1. Client auf [community.developer.battle.net](https://community.developer.battle.net/access/clients) anlegen,
   Redirect-URLs `<SITE_URL>/auth/battlenet` (lokal `http://localhost:3000/auth/battlenet`).
2. `NUXT_BLIZZARD_CLIENT_ID`, `NUXT_BLIZZARD_CLIENT_SECRET` (und optional `NUXT_BLIZZARD_GUILD_SLUG`) setzen.
3. Auf der Probe-Seite „Mit Battle.net verbinden“, dann „Probe starten“. Mit „Ergebnis kopieren“ lässt sich der
   Bericht (ohne Tokens) teilen. Das Battle.net-Token liegt nur im verschlüsselten Session-Cookie und wird mit
   „Battle.net trennen“ entfernt.

**Rangliste:** Im Live-Modus erscheinen alle Gildenmitglieder, die unter *Einstellungen → Sichtbarkeit* zugestimmt
haben, mit ihren eingetragenen Charakteren, soweit diese in der Gilde sind (Stufe und Berufe direkt aus der API, alle
30 Minuten neu abgerufen). Nur ohne Datenbank greift noch der Testlauf mit
`NUXT_BLIZZARD_PREVIEW_CHARACTERS="Vorname Nachname=DiscordID"`.

**Chronik:** Gründung (Datum aus der API, sonst `guildFoundedOn` in `content/chronicle.ts`) sowie automatisch
erkannte Meilensteine aus der Gildenliste (10/25/50/100 Mitglieder, erste Charaktere auf Stufe 40/50/60). Einmal erkannt,
bleiben sie in der Tabelle `guild_milestones` stehen.

Der weitere Plan (API-first + Addon, Punkte, Verifizierung) steht in `docs/ADDON-PLAN.md`.

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
   Aktuell: `…_initial_schema.sql`, `…_two_part_names.sql`, `…_members.sql`.
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
content/           # redaktionelle Texte: guild.ts, rules.ts, chronicle.ts (manuelle Chronik-Meilensteine), points.ts (Punkteregeln) – per Schema geprüft
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

### Qualität

- **Tests:** Unit (Domain, Integrationen mit simulierten APIs, Datenbank-Migration in PGlite), Komponenten, E2E
  (Desktop und Mobil) inkl. automatischer Barrierefreiheitsprüfung (axe-core, WCAG 2.1 AA).
- **Sicherheits-Header** für alle Seiten (`nosniff`, Referrer-Policy, Frame-Schutz, Permissions-Policy).
- Mehrere Rollen-IDs sind kommagetrennt möglich, z. B. `NUXT_DISCORD_ADMIN_ROLE_ID=admin-id,mod-id`.

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

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden → **Add New → Project** → Repository
   `Nakamado/wow-guild` importieren. Das Framework-Preset „Nuxt“ wird erkannt; Build-Einstellungen nicht ändern
   (pnpm wird über `pnpm-lock.yaml` erkannt).
2. **Environment Variables** (Settings → Environment Variables) für *Production* und *Preview* anlegen:

   | Variable | Wert |
   |---|---|
   | `NUXT_PUBLIC_SITE_URL` | die Vercel-Domain, z. B. `https://wow-guild.vercel.app` (ohne `/` am Ende) |
   | `NUXT_PUBLIC_DEMO_MODE` | `false` für die echte Seite, `true` für eine reine Demo |
   | `NUXT_APP_SECRET` | neues Zufalls-Secret, mind. 32 Zeichen (nicht das lokale) |
   | alle weiteren | wie in deiner lokalen `.env` (Discord, Twitch, Supabase, Gilde) |

   Ein zufälliges Secret erzeugt PowerShell z. B. mit
   `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`.
3. **Deploy** klicken. Danach in der **Discord-App unter OAuth2 → Redirects** zusätzlich
   `https://<deine-domain>/auth/discord` eintragen und speichern.
4. Testen: `/api/me` aufrufen (zeigt `loginAvailable`), dann anmelden. In den Vercel-**Logs** steht beim ersten
   Aufruf, welche Quellen live sind (`[providers] …`).

**Preview-Deployments:** Jeder Pull Request bekommt eine eigene Vorschau-URL. Der Discord-Login funktioniert dort
nur, wenn deren Adresse ebenfalls als Redirect eingetragen ist – für Vorschauen am einfachsten
`NUXT_PUBLIC_DEMO_MODE=true` nur für *Preview* setzen.

**Eigene Domain (`www.mukimuki-forever.de`):**

- Vercel → *Settings → Domains*: `www.mukimuki-forever.de` als Hauptdomain, `mukimuki-forever.de` mit
  „Redirect to“ auf die www-Adresse (308).
- DNS bei united-domains: `A` für `@` und `CNAME` für `www` – exakt die Werte aus Vercels Domain-Karte.
  MX-, SPF-, DKIM- und DMARC-Einträge des Postfachs bleiben unverändert.
- `NUXT_PUBLIC_SITE_URL=https://www.mukimuki-forever.de` (Production) – daraus entstehen Canonical- und
  Open-Graph-URLs, `sitemap.xml`, `robots.txt` und die OAuth-Redirects.
- Redirects ergänzen: Discord `…/auth/discord`, Battle.net `…/auth/battlenet` (alte Adressen erst später entfernen).
- Die alte `*.vercel.app`-Adresse leitet in Production automatisch auf die Hauptdomain um
  (`server/middleware/canonical-host.ts`); Vorschauen bleiben erreichbar, aber `robots.txt` sperrt sie für Suchmaschinen.
- Kontaktadresse: `NUXT_PUBLIC_CONTACT_EMAIL` (Standard `kontakt@mukimuki-forever.de`).

## Betrieb & Fehlersuche

| Meldung im Log | Ursache | Lösung |
|---|---|---|
| `[providers] … off (missing-credentials: …)` | Variable fehlt – der Bereich bleibt leer | genannte Variable setzen, neu deployen |
| `Session nicht lesbar – ist NUXT_APP_SECRET gesetzt?` | Secret fehlt oder ist leer | `NUXT_APP_SECRET` setzen; lokal die Zeile auskommentieren |
| `[supabase] … ist ein öffentlicher Key` | publishable/anon-Key statt Secret | Secret- bzw. `service_role`-Key eintragen |
| `[twitch.status] nicht erreichbar (twitch 400 …)` | Twitch-Client-ID/Secret falsch | Werte in der Twitch-Konsole prüfen |
| `[discord.members] nicht erreichbar (discord 403 …)` | Bot nicht auf dem Server oder Intent fehlt | Bot einladen, „Server Members Intent“ aktivieren |
| Discord: „Ungültiges OAuth2 redirect_uri“ | Redirect nicht eingetragen | `<SITE_URL>/auth/discord` exakt eintragen und speichern |

Fällt Twitch oder Discord aus, zeigt die Seite Ersatzinhalte (offline, leere Liste, Hinweis) und fragt den Dienst
erst nach einer Minute erneut an.

## Rechtliches

Nicht-kommerzielles Fanprojekt. World of Warcraft ist eine Marke von Blizzard Entertainment, Inc. Diese Seite steht
in keiner Verbindung zu Blizzard Entertainment, Discord oder Twitch. Branding-Assets von Miinyu werden nur mit ihrer
Freigabe verwendet.
