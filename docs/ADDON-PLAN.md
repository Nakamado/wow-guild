# Hybrid-Architektur: Blizzard-API + WoW-Addon (Entwurf, nicht freigegeben)

> Stand: 06.11.2026 (2. Fassung, mit Punktesystem und Verifizierung). **Noch nichts davon ist implementiert.**
> Alle API-Angaben stammen aus Community-Tests (03.–05.11.); Blizzard hat für Forever **nichts offiziell
> dokumentiert** und im Entwicklerforum nicht geantwortet. Eigene Tests mit Zugangsdaten stehen noch aus (Schritt 0).

## 0. Ergebnis der eigenen API-Probe (06.11.2026, EU, Charakter „Nak Totembart“, Stufe 14)

| Endpunkt | Ergebnis |
|---|---|
| App-Token (Client-Credentials) | ✅ |
| `/profile/user/wow` (Battle.net-Login) | ✅ liefert die eigenen Forever-Charaktere → **Verifizierung über Battle.net funktioniert** |
| `/profile/user/wow/protected-character/6939-6815512` | ✅ – versteckte **Realm-ID 6939**, Charakter-ID 6815512 (enthält auch Gold/Position → wird nicht gespeichert) |
| `/profile/wow/character/nak-totembart` (realmlos, App-Token) | ✅ 31 Felder, u. a. `level`, `race`, `character_class`, `faction`, `ruleset`, `last_login_timestamp`, Links zu allen Unterseiten |
| …`/equipment`, `/professions` (mit Stufen/`tiers`), `/quests/completed`, `/specializations`, `/achievements`, `/statistics`, `/reputations` | ✅ alle mit Daten |
| …`/encounters/dungeons` | ✅ 200, aber **ohne Inhalt** (bei Stufe 14 noch kein Dungeon?) – Inhalt offen |
| …`/encounters/raids` | ✅ 200, nur `character` (Raids öffnen am 09.12.) |
| `/data/wow/playable-class/index?namespace=static-forever-eu` | ✅ jetzt auch **ohne** Versionsnummer |
| `/data/wow/realm/index?namespace=dynamic-forever-eu` | ❌ 404 – Realm-ID 6939 lässt sich derzeit keinem Namen zuordnen |
| Gildenliste | noch nicht getestet (Gilde/Slug fehlt) |

**Folgerung:** Die API liefert weit mehr als erwartet. Stufe, Berufe mit Skillwerten und abgeschlossene Quests –
also fast alles für das Punktesystem – kommen **ohne Addon**. Offen bleibt nur, ob `encounters/dungeons` Abschlüsse
und Bosskills zählt (nächste Probe mit einem Charakter, der einen Dungeon abgeschlossen hat).

## 1. Recherche: Was liefert die Blizzard-API für Forever?

**Namespaces** (inoffiziell, gefunden durch Ausprobieren):

| Namespace | Stand | Quelle |
|---|---|---|
| `profile-forever-eu` | antwortet | Blizzard-Forum (02.11.), Quartz-Gilde (05.11.) |
| `dynamic-forever-eu` | antwortet (Realm-Index wechselnd: mal 200, mal 404) | Forum, Quartz |
| `static-forever-eu` | 403 – nur **versioniert** (`static-1.60.1_70399-forever-eu`); Version aus den Links der Antworten lesen, nicht fest einbauen | Forum, Quartz |

**Endpunkte:**

| Endpunkt | Stand | Anmerkung |
|---|---|---|
| `/profile/user/wow` (Battle.net-Login des Spielers, Scope `wow.profile`) | **funktioniert** | eigene Forever-Charaktere: Name, Nachname, Klasse, Volk, Fraktion, Stufe |
| `/data/wow/guild/{gilden-slug}/roster` | **funktioniert seit 05.11.** (eine Gilde getestet) | ohne Realm; je Mitglied Name, Nachname, Slug, Stufe, Klasse, Volk, Rang. Stufe kann hinterherhinken |
| `/profile/wow/character/{slug}` | **teilweise** | für einen Teil der Charaktere 200, andere 404; erst nach dem ersten Login gefüllt |
| `…/equipment`, `…/professions`, `…/quests/completed`, `…/encounters/raids`, `…/specializations`, Erfolge | **unbekannt** | nicht getestet bzw. nicht veröffentlicht. In Classic Era gibt es z. B. gar keinen Berufe-Endpunkt |
| Armory-Seite für Forever | gibt es nicht | — |

Folgerung vor der eigenen Probe: Verlässlich schienen nur Gildenliste und Account-Charakterliste. **Überholt durch
Abschnitt 0** – die Charakter-Endpunkte antworten inzwischen fast vollständig.

### Serverstruktur: Regelsatz statt Realm

- Forever hat **keine Realm-Auswahl**. Spieler wählen einen Regelsatz (Normal, PvP, Rollenspiel, RP-PvP, später Hardcore); jeder Regelsatz ist **eine gemeinsame Welt pro Region**, bei Bedarf in Layer geteilt. Blizzard nennt PvE offiziell **„Normal“**.
- **Namen** (Vor- + Nachname) sind in der ganzen Region eindeutig, über alle Regelsätze hinweg.
- **Technisch gibt es Realms trotzdem, nur versteckt:** Die Charakter-Links der API sind realmlos (`/profile/wow/character/{vorname}-{nachname}`), die geschützte Charakteransicht nutzt aber `{realmId}-{characterId}`, und `dynamic-forever-eu` hat einen Realm-Index, gegen den sich diese ID abgleichen lässt. Welche Realm-ID(s) zum Regelsatz Normal/EU gehören, ist **nicht dokumentiert** → Schritt 0 klärt das.

**Konsequenz für uns:**
- **Keine Realm-Auswahl in der Oberfläche.** Region (EU) und Regelsatz (Anzeige „PvE“) sind feste Konfiguration (`NUXT_PUBLIC_GUILD_REALM`, neu `NUXT_BLIZZARD_REGION=eu`).
- **Intern** speichern wir je Charakter die **Blizzard-Charakter-ID und Realm-ID**, sobald die API sie liefert. Eindeutiger Schlüssel ist `(region, blizzard_character_id)`; solange keine ID bekannt ist, der normalisierte volle Name `(region, "vorname nachname")` – der ist laut Blizzard regionsweit eindeutig.
- Die Realm-ID wird **gelesen, nie eingegeben**: aus den API-Antworten bzw. dem Realm-Index, und beim Abgleich geprüft (Charakter auf einem anderen Regelsatz → nicht unserer Gilde zugeordnet).
- Die Gilde wird über ihren **Slug** angesprochen (z. B. `gildenname-…`, Format aus der Gildenliste); Name und Slug kommen aus der Konfiguration (`NUXT_BLIZZARD_GUILD_SLUG`), nichts ist fest im Code.

## 2. Machbarkeitsmatrix

Legende: ✅ bestätigt · 🧪 experimentell / teilweise · ❔ unbestätigt · — nicht möglich

| Information | Blizzard-API | Addon | Bewertung |
|---|---|---|---|
| Name, Nachname, Charakter-ID, Realm-ID | ✅ Profil + geschützte Ansicht (Probe 06.11.) | ✅ | **API** |
| Stufe, Klasse, Volk, Fraktion, Regelsatz | ✅ Profil (Probe 06.11.) | ✅ | **API** |
| Gildenzugehörigkeit, Mitgliederliste, Rang | 🧪 Roster (andere Gilde bestätigt, unsere ungetestet) | ✅ (Gildenliste des Admin-Addons) | **API**, Addon als Rückfall |
| Zuordnung Charakter → Person | ✅ Battle.net-Login (Probe 06.11.) | ✅ Bestätigungscode (Weg B) | **API**, Code für Mitglieder ohne Battle.net |
| Berufe und Skillwerte | ✅ `professions` mit Stufen (Probe 06.11.) | ✅ | **API** |
| Abgeschlossene Quests | ✅ `quests/completed` (Probe 06.11.) | ✅ | **API** |
| Dungeon-Abschlüsse, Bosskills | 🧪 `encounters/dungeons` antwortet, Inhalt noch leer | ✅ ab Installation | **offen** – entscheidet die nächste Probe |
| Raidfortschritt | 🧪 `encounters/raids` antwortet (Raids ab 09.12.) | ✅ ab Installation | **offen** |
| Ausrüstung, Talente, Erfolge, Ruf | ✅ (Probe 06.11.) | ✅ | **API** (nur bei Bedarf speichern) |
| Historische Levelaufstiege | — | ✅ ab Installation | **Addon**; Vergangenes wird aus der aktuellen Stufe abgeleitet |
| Zeitpunkt eines Fortschritts vor Addon-Installation | — | — | nicht verfügbar → Initial-Scan nur mit „vor Datum X“ |

**Technische Grenzen des Addons** (Forever nutzt den modernen Client mit Addon-Beschränkungen):
- Kein Internet: Daten landen in SavedVariables, die WoW erst bei Logout bzw. `/reload` schreibt.
- Addon-Nachrichten (Gildenkanal oder Flüstern) haben **max. 255 Byte**, werden gedrosselt und kommen nur an, wenn der Empfänger online ist.
- Forever meldet Gründe wie „nicht in der Gilde“, „Ziel offline“ oder eine Sperre für Addon-Nachrichten; das muss das Addon prüfen statt still zu scheitern.
- Komprimierung: der moderne Client hat `C_EncodingUtil` (Komprimieren, CBOR, Base64) – **auf Forever noch zu testen**.

## 3. Datenquellen und Priorität

1. **Blizzard-API (Webseite holt selbst):** Gildenliste und Stufe/Klasse/Volk (stündlich), Charakterliste beim Battle.net-Login. Sobald weitere Endpunkte antworten, übernehmen sie Berufe, Ausrüstung usw. – per Schalter je Endpunkt, ohne Addon-Update.
2. **Addon:** nur Ereignisse, die die API nicht liefert: Quest erledigt, Boss besiegt, Dungeon abgeschlossen, Beruf gestiegen, Stufe erreicht (mit Zeitpunkt).
3. **Initial-Scan (einmalig je Charakter, nach Zustimmung):** erledigte Quest-IDs, Berufe mit Skillwert, aktuelle Raid-Sperren. Ergebnis gilt als „bis Datum X erreicht“, nicht als einzelne datierte Ereignisse.

**Vertrauen gilt je Information, nicht je Quelle.** Beispiel: Die Stufe aus dem Roster kann hinterherhinken – meldet das Addon eine höhere Stufe mit Zeitpunkt, gewinnt die höhere. Ein Bosskill aus der API (falls es ihn gibt) und derselbe Kill aus dem Addon ergeben **einen** Eintrag.

## 4. Gemeinsames Datenmodell (Supabase, Entwurf)

| Tabelle | Inhalt |
|---|---|
| `wow_characters` | eine Zeile je Spielcharakter: Blizzard-ID (wenn bekannt), Name + Nachname (normalisiert), Klasse, Volk, Stufe, je Feld `source` + `observed_at` |
| `character_links` | Zuordnung Charakter → Discord-Mitglied mit Nachweis: `battlenet`, `addon_code` (beide verifiziert) oder `self` (Selbstauskunft, zählt nicht für Punkte) |
| `verification_codes` | einmalige Codes: Discord-ID, beantragter Charakter, Ablauf, benutzt am |
| `progress_events` | Ereignisse mit **natürlichem Schlüssel** `(character_id, type, object_id)`, z. B. `(…, 'quest', 1234)`, `(…, 'boss', 'onyxia')`, `(…, 'level', 42)` – eindeutig, deshalb keine Doppelpunkte, egal welche Quelle zuerst meldet. Dazu `occurred_at`, `occurred_before` (Initial-Scan), `sources[]` |
| `points_ledger` | Punkte nur als Ableitung aus `progress_events` (eine Zeile je Ereignis + Regelversion) – nachvollziehbar und neu berechenbar |
| `sync_state` | je Charakter und Quelle: letzter Stand (API-Abruf, letzte bestätigte Addon-Sequenznummer) |
| `consents` | Opt-ins je Mitglied: Addon-Übertragung, öffentliche Statistik; Widerruf löscht bzw. anonymisiert |

Widersprüche: höhere Stufe gewinnt; bei Klasse/Volk gewinnt die API (Addon-Wert wird protokolliert); Ereignisse, die
die API widerlegt (z. B. Stufe 60 laut Addon, Stufe 20 laut API ohne spätere Bestätigung), werden markiert statt verbucht.

**Serverseitige Prüfung jedes Uploads:** Schema (Zod), bekannte IDs (Quest/Boss aus den Spieldaten), plausible
Zeitpunkte (nicht in der Zukunft, nicht vor dem Forever-Start 04.11.2026), monotone Stufen, Charakter gehört zur Gilde
(Roster) und hat zugestimmt.

> **Nach der Probe vom 06.11.:** Liefert `encounters/dungeons` Abschlüsse mit Zählern (wie in Retail:
> `completed_count` je Instanz), wird das **Addon für das Punktesystem gar nicht gebraucht**: Wiederholte Abschlüsse
> ergeben sich aus der Differenz der Zähler zwischen zwei Abrufen. Das Addon bliebe dann nur Rückfall für
> Bosskills einzelner Bosse ohne Abschluss. Die folgenden Abschnitte gelten nur für den Fall, dass die API das nicht liefert.

## 5. Addon-Kommunikation – schlank

**Ablauf:** Mitglieder-Addon → (Addon-Nachricht im Gildenkanal/Flüstern) → Admin-Addon sammelt → Admin exportiert per
`/reload` die SavedVariables → lädt **eine Datei** auf der Webseite hoch. Kein Mitglied lädt etwas hoch oder installiert ein Programm.

**Was sich durch API-first einspart:**
- Stufe, Klasse, Volk, Gilde: **gar nicht** mehr übertragen (kommt aus der API; das Admin-Addon liest zur Not die Gildenliste selbst).
- Keine Komplett-Snapshots: Das Mitglieder-Addon sendet nur **neue Ereignisse** mit fortlaufender Nummer je Charakter.
- Bestätigung: Das Admin-Addon bestätigt die höchste empfangene Nummer; bestätigte Ereignisse werden nie wieder gesendet, unbestätigte beim nächsten Treffen erneut (idempotent dank Schlüssel).
- Initial-Scan (größter Brocken: Quest-Liste) einmalig, gepackt als Bitmaske über Quest-IDs, komprimiert (falls `C_EncodingUtil` verfügbar), in 240-Byte-Stücke geteilt, mit Prüfsumme.

**Grobe Abschätzung je aktivem Charakter und Woche:**

| | Snapshot-Ansatz | API-first + Ereignisse |
|---|---|---|
| Laufend | ~2–5 KB je Sync (Quests, Berufe, Ausrüstung, Stammdaten), mehrmals pro Woche | ~10–40 Ereignisse à ~12 Byte ≈ **0,1–0,5 KB/Woche** |
| Einmalig | — | Initial-Scan ≈ 1–3 KB (komprimiert evtl. < 1 KB) |

→ laufend **rund 90–98 % weniger** Datenvolumen und deutlich weniger Nachrichten. Die Zahlen sind Schätzungen und werden mit dem Prototyp gemessen.

## 6. Charakter-Verifizierung (Discord bleibt das Login)

**Ziel:** Ein Charakter wird einem Discord-Mitglied erst zugeordnet, wenn nachgewiesen ist, dass diese Person ihn
**kontrolliert** – nicht nur, dass sie seinen Namen kennt.

### Weg A: Battle.net (optional, „Charaktere verknüpfen“)

- Discord-Login bleibt Pflicht; Battle.net wird **zusätzlich** in den Einstellungen verknüpft (OAuth Authorization Code, Scope `wow.profile`).
- Danach ruft der Server einmal `/profile/user/wow?namespace=profile-forever-eu` mit dem Token des Nutzers ab und
  ordnet die zurückgegebenen Charaktere per **Charakter-ID** den Einträgen aus der Gildenliste zu. Das Token wird danach verworfen.
- Ergebnis: Zuordnung mit Nachweis `battlenet` (stärkster Nachweis, Blizzard bestätigt den Account).

**Stand der Prüfung:** Community-Tests vom 02. und 04.11. berichten, dass der Endpunkt mit einem Nutzer-Token die
eigenen Forever-Charaktere liefert (Name, Nachname, Klasse, Volk, Fraktion, Stufe). Ein anderer Test vom 05.11. fand
für sein Konto **keine** Charaktere. Das ist widersprüchlich und **noch nicht belastbar**. → Wird in Schritt 0 mit deinem
Account getestet. Bekannte Stolperfalle: Ohne den Scope im Token antwortet die API mit 403; dann hilft es, die App unter
„Autorisierte Anwendungen“ im Battle.net-Konto zu entfernen und neu zu verbinden.

### Weg B: Bestätigungscode über das Addon (falls A nicht zuverlässig ist, oder für Mitglieder ohne Battle.net-Link)

1. Das Mitglied ist **mit Discord angemeldet** und wählt auf der Webseite „Charakter bestätigen: Vorname Nachname“.
   Der Server erzeugt einen einmaligen Code (z. B. 6 Zeichen, 30 Minuten gültig), gebunden an **Discord-ID + Charaktername**.
2. Im Spiel gibt das Mitglied **mit genau diesem Charakter** `/gilde bestaetigen CODE` ein. Das Addon zeigt vorher:
   „Dieser Charakter wird mit dem Discord-Konto *Anzeigename* verknüpft. Fortfahren?“ (Schutz vor weitergegebenen Codes).
3. Das Addon schickt den Code per Addon-Nachricht an dein Addon. **Den Absendernamen setzt der WoW-Server**, nicht das
   Addon – er lässt sich nicht fälschen. Dein Addon speichert `(Code, Absendername, Zeitpunkt)`.
4. Beim nächsten Upload prüft der Server: Code existiert, ist nicht abgelaufen, nicht benutzt, und der **Absender
   entspricht dem beantragten Charakter**. Erst dann wird zugeordnet (Nachweis `addon_code`).

Warum das belastbar ist: Der Code verbindet den **authentifizierten Discord-Nutzer** (er hat ihn angefordert) mit dem
**server-authentifizierten Ingame-Absender** (nur wer den Charakter spielt, kann als dieser Charakter senden).
Ein Code allein beweist nichts; erst die Kombination.

Schwächen und Gegenmaßnahmen:
- Verzögerung bis zu deinem nächsten Upload → Status „wartet auf Bestätigung“ auf der Webseite.
- Du musst gleichzeitig online sein → das Mitglieder-Addon hält den Code bis zur Zustellung (max. Gültigkeit 7 Tage statt 30 Minuten, falls nötig).
- Weitergegebener Code → Bestätigungsdialog im Addon, Zuordnung jederzeit vom Mitglied oder dir lösbar.

### Weg C: Selbstauskunft (wie heute)

Bleibt erlaubt für Charakterlisten und Gruppenplanung, zählt aber **nicht** für Ranglisten und Punkte.

## 7. Punktesystem

**Regeln (vorläufig, alles konfigurierbar):**

| Aktivität | Punkte | Art | Rückwirkend? |
|---|---:|---|---|
| Levelaufstieg | 100 je Stufe | einmalig | ✅ aus aktueller Stufe (Stufe 23 = 22 × 100) |
| Dungeon-Erstabschluss | +100 Bonus | einmalig je Charakter und Dungeon | ❌ erst ab erstem nachgewiesenen Abschluss |
| Dungeon-Abschluss | 10 | wiederholbar | ❌ |
| Dungeon-Quest abgeschlossen | 150 | einmalig je Quest | ✅ aus der Liste erledigter Quests (Initial-Scan) |
| Dungeon-Boss besiegt | 2 | wiederholbar | ❌ |
| Berufsmeilenstein 75/150/225/300 | 200 | einmalig je Beruf und Stufe | ✅ aus aktuellem Skillwert |
| Raid-Erstabschluss | +100 Bonus (vorläufig, analog Dungeon) | einmalig je Charakter und Raid | ❌ erst ab erstem nachgewiesenen Abschluss |
| Raid-Boss besiegt | 20 | wiederholbar | ❌ |

- **Abschluss** = Endboss der Instanz besiegt (Addon erkennt das am Kampf-Ende-Ereignis des Endbosses).
- **Erstabschlüsse** zählen je **Charakter** (Dungeons und Raids).
- **Wochenlimit:** wiederholbare Dungeon-, Raid- und Bossaktivität zusammen höchstens **300 Punkte pro Woche und Discord-Mitglied**
  (über alle Charaktere). Einmalige Fortschritte (Erstabschlüsse, Quests, Stufen, Berufe) fallen nicht darunter. Woche = Blizzard-Reset (EU: Mittwoch). Was darüber liegt, wird gespeichert, aber mit 0 Punkten verbucht.
- **Ranglisten:** zwei dauerhafte Listen – **Main** (nur der Hauptcharakter einer Person) und **Gesamt** (alle verifizierten Charaktere einer Person zusammen). Nur mit Opt-in.
- **Nur serverseitig:** Das Addon liefert ausschließlich Ereignisse, nie Punkte.
- **Keine Doppelten:** Punkte entstehen aus `progress_events` mit eindeutigem Schlüssel; ein zweites Melden (API oder
  Addon, Initial-Scan oder laufend) ändert nur `sources[]`, nicht die Punkte.
- **Konfiguration:** Regeln als versionierte Tabelle `points_rules` (Aktivität → Punkte, Limits). Änderungen gelten ab
  einer neuen Regelversion; Ranglisten lassen sich jederzeit neu berechnen.

**Was die API davon schon heute abdeckt:** nur **Levelaufstiege** (Stufe aus der Gildenliste). Alles andere kommt bis auf
Weiteres aus dem Addon. Sobald Blizzard Quests, Berufe oder Bosskämpfe freischaltet, übernimmt die API diese Felder und
das Addon sendet sie nicht mehr.

**Entschieden (06.11.):** Abschluss = Endboss besiegt · Erstabschluss je Charakter · Raid-Bosse im gemeinsamen
Wochenlimit, Raid-Erstabschluss mit Bonus · „Dungeon-Quests“ als Liste (Quest → Instanz) im Instanzkatalog.
Noch offen: Höhe des Raid-Erstabschluss-Bonus (vorläufig 100, konfigurierbar).

## 8. Datenschutz

- Keine öffentliche Darstellung aller Mitglieder; öffentliche Statistiken nur mit **Opt-in** (`consents`).
- Addon überträgt erst nach Zustimmung im Spiel (einmaliger Dialog) **und** auf der Webseite.
- API-Daten nur im benötigten Umfang (keine Ausrüstungshistorie, kein Gold, keine Auktionsdaten).
- Charaktere zählen für Punkte und Ranglisten erst nach **Battle.net-Nachweis** oder **Bestätigungscode** (Abschnitt 6).
- Widerruf: Ereignisse und Punkte werden gelöscht bzw. anonymisiert; Datenschutzerklärung wird ergänzt.

## 9. Implementierungsplan (nach Freigabe)

**Konfiguration statt fester Werte:** Gildenname und Gilden-Slug (noch offen), Region (EU) und Namespace, Regelsatz-Anzeige (PvE), Upload-Berechtigte
(`NUXT_UPLOAD_USER_IDS`, Discord-User-IDs), Punktewerte und Limits – alles über Umgebungsvariablen bzw. die Tabelle
`points_rules`, nichts fest im Code.

0. **API-Probe (½ Tag):** Battle.net-Developer-Client anlegen (develop.battle.net, Redirect `<SITE_URL>/auth/battlenet`).
   Eine nur für Admins sichtbare Seite testet jeden Endpunkt (Gildenliste, Charakterprofil, Ausrüstung, Berufe, Quests,
   Bosskämpfe) und `/profile/user/wow` mit deinem Account, protokolliert Status und Feldnamen, speichert keine Daten.
   **Entscheidet, ob Weg A (Battle.net) trägt.**
1. **API-Sync + Battle.net-Verknüpfung (2–3 Tage):** Gildenliste stündlich → `wow_characters`; optionale Verknüpfung in den Einstellungen.
2. **Datenmodell, Upload, Punkte (3 Tage):** Tabellen aus Abschnitt 4, Upload-Seite nur für `NUXT_UPLOAD_USER_IDS`,
   Validierung, Deduplizierung, Punkteberechnung mit Wochenlimit, zwei Ranglisten (Opt-in).
3. **Addon-Prototyp (4–6 Tage):** Ereignisse erfassen, Initial-Scan, Bestätigungscode (Weg B), Gilden-Kommunikation mit
   Bestätigung und Wiederholung, Export für dich. Test mit 2–3 Mitgliedern.
4. **Einstellungen & Datenschutz (1 Tag):** Opt-ins, Widerruf, Löschung, Datenschutzerklärung.
5. **Ausbau:** Jeder neue API-Endpunkt ersetzt das entsprechende Addon-Ereignis (Schalter je Endpunkt).
