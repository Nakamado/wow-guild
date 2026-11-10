<script setup lang="ts">
const { contactEmail } = useRuntimeConfig().public
</script>

<template>
  <LegalPage title="Datenschutz">
    <h2>1. Verantwortlicher</h2>
    <p>
      Dustin Clever, Rotdornweg 1, 51519 Odenthal, E-Mail:
      <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
    </p>

    <h2>2. Hosting</h2>
    <p>
      Die Webseite wird bei Vercel Inc. (USA) gehostet. Beim Aufruf werden technisch notwendige Daten
      (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser-Informationen) in Server-Logs verarbeitet,
      um die Seite sicher und stabil bereitzustellen (Art. 6 Abs. 1 lit. f DSGVO). Dabei können Daten
      in die USA übermittelt werden; Grundlage sind der Angemessenheitsbeschluss der EU-Kommission
      (EU-US Data Privacy Framework) bzw. EU-Standardvertragsklauseln.
    </p>

    <h2>3. Kontakt per E-Mail</h2>
    <p>
      Wenn du uns eine E-Mail schreibst, verarbeiten wir deine Adresse und den Inhalt nur, um deine
      Anfrage zu beantworten (Art. 6 Abs. 1 lit. f DSGVO). Das Postfach wird von der united-domains GmbH
      (Deutschland) betrieben. Wir löschen die Nachrichten, sobald sie erledigt sind und keine
      Aufbewahrungspflichten bestehen.
    </p>

    <h2>4. Schriftarten und Bilder</h2>
    <p>
      Alle Schriftarten werden lokal von diesem Server ausgeliefert. Es findet keine Verbindung zu
      Google Fonts oder anderen externen Schriftanbietern statt.
    </p>
    <p>
      Profilbilder aus Discord sowie Vorschaubilder von Twitch-Clips und des laufenden Livestreams lädt unser Server bzw. Hoster und
      liefert sie selbst aus. Dein Browser verbindet sich dafür nicht direkt mit Discord oder Twitch.
    </p>

    <h2>5. Lokale Speicherung im Browser</h2>
    <p>
      Im Demo-Modus werden Einstellungen und simulierte Änderungen (z. B. Gruppenanmeldungen)
      ausschließlich im Session-Speicher deines Browsers abgelegt und beim Schließen des Tabs
      gelöscht. Es werden keine Tracking- oder Analyse-Cookies eingesetzt.
    </p>

    <h2>6. Anmeldung mit Discord</h2>
    <p>
      Für Mitgliedsfunktionen meldest du dich über Discord an (Berechtigungen „identify“ und
      „guilds.members.read“). Dabei erhalten wir deine Discord-ID, deinen Anzeigenamen, deinen
      Avatar und deine Rollen auf dem Community-Server – nicht deine E-Mail-Adresse und nicht
      deine Nachrichten. Damit prüfen wir, ob du zur Gilde gehörst (Art. 6 Abs. 1 lit. b und f DSGVO).
    </p>
    <p>
      Die Sitzung liegt in einem verschlüsselten, technisch notwendigen Cookie (gültig bis zu
      7 Tage). Darin steht auch ein Discord-Zugriffstoken mit genau diesen Berechtigungen, damit
      deine Gildenrolle regelmäßig nachgeprüft werden kann. Dabei werden auch Anzeigename und
      Avatar aktualisiert. Beim Abmelden wird das Cookie gelöscht.
    </p>
    <p>
      Für die Nachprüfung der Gildenrolle und für die Termine im Kalender nutzt die Webseite zusätzlich
      einen eigenen Discord-Bot ohne Berechtigungen auf dem Community-Server. Er liest nur die Rollen
      angemeldeter Personen und die geplanten Server-Events, keine Nachrichten.
    </p>

    <h2>7. Gespeicherte Daten (Datenbank)</h2>
    <p>
      Gespeichert werden in einer Datenbank bei Supabase Inc. (Rechenzentrum in Irland, EU): dein Profil (Discord-ID, Anzeigename,
      Avatar, Stand der Gildenrolle und der Streamer-Rolle, Zeitpunkt der letzten Anmeldung, deine
      Einstellung zur Rangliste und – falls du ihn einträgst – deinen Twitch-Kanalnamen), die Charaktere,
      die du selbst einträgst, sowie deine Gruppenanmeldungen. Andere angemeldete Gildenmitglieder sehen diese
      Angaben; Besucher ohne Anmeldung nicht. Gespeichert wird außerdem deine Rolle auf der Webseite
      (Mitglied oder Admin), die nur der Betreiber vergeben kann.
    </p>
    <p>
      Charaktere kannst du jederzeit in den Einstellungen löschen, ebenso dein gesamtes Konto: Dabei
      werden Profil, Charaktere, Gruppenanmeldungen, selbst erstellte Gruppen, Ranglisten-Teilnahme und
      zugehörige Nachweise gelöscht. Im Änderungsprotokoll (Abschnitt 10) bleibt bis zum Ablauf der
      Frist nur der Eintrag „Konto gelöscht“ mit deiner Discord-ID. Mit einem erneuten Login kannst du
      dich jederzeit wieder registrieren.
    </p>

    <h2>8. Spieldaten von Blizzard</h2>
    <p>
      Wenn du einen Charakter einträgst, prüfen wir über die öffentliche Schnittstelle von Blizzard
      Entertainment, Inc., ob es diesen Charakter in WoW: Forever gibt. Übermittelt wird dabei nur der
      Charaktername, nicht deine Discord-Daten. Für die Rangliste rufen wir öffentliche Spieldaten
      (z. B. Stufe, Klasse, Berufe, abgeschlossene Inhalte) ab und berechnen daraus Punkte.
    </p>

    <h2>9. Rangliste</h2>
    <p>
      In der öffentlich sichtbaren Rangliste erscheinen nur Personen, die dem zugestimmt haben – mit
      Discord-Anzeigename, Avatar, Charakter und Punkten (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO). Die
      Teilnahme ist freiwillig; du kannst sie selbst in den Einstellungen oder beim Hinzufügen eines
      Charakters aktivieren. Dann zählen alle deine Charaktere in der Gilde.
    </p>
    <p>
      Hast du dem Betreiber deine Zustimmung auf anderem Weg ausdrücklich gegeben (z. B. per
      Discord-Nachricht), kann er sie dokumentieren und einzelne Charaktere freischalten – jeweils nur
      den Charakter, für den die Zustimmung gilt. Dazu speichern wir Art und Datum der Zustimmung, eine
      optionale kurze interne Notiz und optional einen auf die Zustimmung zugeschnittenen Screenshot als
      Nachweis (Art. 7 Abs. 1 DSGVO). Screenshots liegen in einem nicht öffentlichen Speicher bei Supabase
      (Rechenzentrum in Irland, EU); Zugriff hat ausschließlich der Betreiber, nicht andere Admins.
    </p>
    <p>
      Deine Zustimmung kannst du jederzeit in den Einstellungen widerrufen. Der Widerruf gilt sofort für
      alle deine Charaktere, auch für freigeschaltete; eine erneute Freischaltung braucht eine neue
      Zustimmung. Screenshots werden mit dem Widerruf gelöscht. Die übrigen Angaben zur früheren
      Zustimmung bewahren wir als Nachweis noch 12 Monate auf und löschen sie dann automatisch; bei
      Löschung deines Kontos sofort.
    </p>

    <h2>10. Änderungsprotokoll</h2>
    <p>
      Damit sich Änderungen an der Webseite nachvollziehen und Fehler oder Missbrauch aufklären lassen,
      protokollieren wir wesentliche Konto- und Charakteränderungen: die erstmalige Registrierung, das
      Hinzufügen, Umbenennen und Entfernen von Charakteren, Erteilung und Widerruf der
      Ranglisten-Teilnahme, die Vergabe und den Entzug von Adminrechten sowie das Löschen eines Kontos.
    </p>
    <p>
      Gespeichert werden nur die Art der Änderung, der Zeitpunkt, die Discord-ID der ausführenden Person,
      die Kennung des betroffenen Kontos bzw. Charakters und eine kurze Beschreibung (z. B. den
      Charakternamen). Nicht protokolliert werden Logins, Seitenaufrufe, Klicks oder IP-Adressen.
      Einsehen kann das Protokoll ausschließlich der Betreiber. Einträge werden nach 90 Tagen automatisch
      gelöscht. Rechtsgrundlage ist unser berechtigtes Interesse an einer sicheren und nachvollziehbaren
      Verwaltung der Webseite (Art. 6 Abs. 1 lit. f DSGVO); du kannst dem aus Gründen, die sich aus deiner
      besonderen Situation ergeben, widersprechen.
    </p>

    <h2>11. Twitch-Inhalte</h2>
    <p>
      Twitch-Clips und Streams werden erst nach deiner ausdrücklichen Zustimmung per Klick geladen
      (2-Klick-Lösung). Erst dann werden Daten an Twitch Interactive, Inc. übertragen. Hast du die
      Discord-Rolle „Streamer“ und trägst deinen Twitch-Kanal ein, zeigen wir deinen Kanal (Name,
      Profilbild, Livestatus) unter „Streamer“ und deine World-of-Warcraft-Clips unter „Clips“. Den Kanal
      kannst du jederzeit in den Einstellungen entfernen.
    </p>

    <h2>12. Deine Rechte</h2>
    <p>
      Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
      Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer
      Datenschutz-Aufsichtsbehörde.
    </p>
  </LegalPage>
</template>
