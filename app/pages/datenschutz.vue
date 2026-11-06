<template>
  <LegalPage title="Datenschutz">
    <template #notice>
      <strong>Entwurf:</strong> Diese Datenschutzerklärung beschreibt den aktuellen Funktionsumfang
      (Discord-Login, Twitch, Datenbank) und muss vor dem Livegang geprüft werden. Markierte Angaben sind Platzhalter. Sie ersetzt keine
      Rechtsberatung.
    </template>

    <h2>1. Verantwortlicher</h2>
    <p>Dustin Clever, Rotdornweg 1, 51519 Odenthal, E-Mail: dustin.clever@gmail.com</p>

    <h2>2. Hosting</h2>
    <p>
      Die Webseite wird bei <mark>[Hosting-Anbieter, voraussichtlich Vercel Inc.]</mark> gehostet.
      Beim Aufruf werden technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite,
      Browser-Informationen) in Server-Logs verarbeitet, um die Seite sicher und stabil
      bereitzustellen (Art. 6 Abs. 1 lit. f DSGVO).
    </p>

    <h2>3. Schriftarten</h2>
    <p>
      Alle Schriftarten werden lokal von diesem Server ausgeliefert. Es findet keine Verbindung zu
      Google Fonts oder anderen externen Schriftanbietern statt.
    </p>

    <h2>4. Lokale Speicherung im Browser</h2>
    <p>
      Im Demo-Modus werden Einstellungen und simulierte Änderungen (z. B. Gruppenanmeldungen)
      ausschließlich im Session-Speicher deines Browsers abgelegt und beim Schließen des Tabs
      gelöscht. Es werden keine Tracking- oder Analyse-Cookies eingesetzt.
    </p>

    <h2>5. Anmeldung mit Discord</h2>
    <p>
      Für Mitgliedsfunktionen meldest du dich über Discord an (Berechtigungen „identify“ und
      „guilds.members.read“). Dabei erhalten wir deine Discord-ID, deinen Anzeigenamen, deinen
      Avatar und deine Rollen auf dem Community-Server – nicht deine E-Mail-Adresse und nicht
      deine Nachrichten. Damit prüfen wir, ob du zur Gilde gehörst (Art. 6 Abs. 1 lit. b und f DSGVO).
    </p>
    <p>
      Die Sitzung liegt in einem verschlüsselten, technisch notwendigen Cookie (gültig bis zu
      7 Tage). Darin steht auch ein Discord-Zugriffstoken mit genau diesen Berechtigungen, damit
      deine Gildenrolle regelmäßig nachgeprüft werden kann. Beim Abmelden wird das Cookie gelöscht.
    </p>

    <h2>6. Gespeicherte Daten (Datenbank)</h2>
    <p>
      Gespeichert werden in einer Datenbank bei <mark>[Supabase Inc., Rechenzentrum Frankfurt]</mark>:
      dein Profil (Discord-ID, Anzeigename, Avatar, Stand der Gildenrolle, Zeitpunkt der letzten
      Anmeldung), die Charaktere, die du selbst einträgst, sowie deine Gruppenanmeldungen.
      Andere angemeldete Gildenmitglieder sehen diese Angaben; Besucher ohne Anmeldung nicht.
      Charaktere kannst du jederzeit in den Einstellungen löschen; die Löschung deines Profils
      erfolgt auf Anfrage an die oben genannte Adresse.
    </p>

    <h2>7. Twitch-Inhalte</h2>
    <p>
      Twitch-Clips und Streams werden erst nach deiner ausdrücklichen Zustimmung per Klick geladen
      (2-Klick-Lösung). Erst dann werden Daten an Twitch Interactive, Inc. übertragen.
    </p>

    <h2>8. Deine Rechte</h2>
    <p>
      Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
      Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer
      Datenschutz-Aufsichtsbehörde.
    </p>
  </LegalPage>
</template>
