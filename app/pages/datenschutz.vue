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
      Profilbilder aus Discord und Vorschaubilder von Twitch-Clips lädt unser Server bzw. Hoster und
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

    <h2>7. Gespeicherte Daten (Datenbank)</h2>
    <p>
      Gespeichert werden in einer Datenbank bei Supabase Inc. (Rechenzentrum in Irland, EU): dein Profil (Discord-ID, Anzeigename,
      Avatar, Stand der Gildenrolle, Zeitpunkt der letzten Anmeldung), die Charaktere, die du selbst
      einträgst, sowie deine Gruppenanmeldungen. Andere angemeldete Gildenmitglieder sehen diese
      Angaben; Besucher ohne Anmeldung nicht. Charaktere kannst du jederzeit in den Einstellungen
      löschen; die Löschung deines Profils erfolgt auf Anfrage an die oben genannte Adresse.
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
      Discord-Anzeigename, Avatar, Charakter und Punkten (Art. 6 Abs. 1 lit. a DSGVO). Die Zustimmung
      kannst du jederzeit widerrufen; dann wirst du aus der Rangliste entfernt.
    </p>

    <h2>10. Twitch-Inhalte</h2>
    <p>
      Twitch-Clips und Streams werden erst nach deiner ausdrücklichen Zustimmung per Klick geladen
      (2-Klick-Lösung). Erst dann werden Daten an Twitch Interactive, Inc. übertragen.
    </p>

    <h2>11. Deine Rechte</h2>
    <p>
      Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
      Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer
      Datenschutz-Aufsichtsbehörde.
    </p>
  </LegalPage>
</template>
