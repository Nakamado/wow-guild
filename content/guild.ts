import type { GuildContent } from '../shared/schemas/content'

/**
 * Texte für Startseite und Gildenseite.
 * ENTWURF: Platzhaltertexte, bis die Gildenleitung eigene Formulierungen liefert.
 * Zum Bearbeiten einfach die Strings ändern – die Struktur wird per Test geprüft.
 */
export const guildContent: GuildContent = {
  isDraft: true,
  tagline: 'Eine Allianz-Gilde für alle, die Azeroth lieber gemeinsam als schnell erleben.',
  intro: [
    'Wir sind die Gilde aus Miinyus Community für WoW: Forever. Bei uns zählt nicht, wer zuerst Stufe 60 erreicht, sondern dass niemand allein vor der Instanz steht.',
    'Ob du zum ersten Mal Classic spielst oder jeden Winkel der Todesminen kennst: Du findest hier Leute für Dungeons, Raids und alles dazwischen.',
  ],
  values: [
    { title: 'Miteinander vor Tempo', text: 'Wir erklären Bosse, warten auf Nachzügler und feiern jeden ersten Kill, auch den zehnten.' },
    { title: 'Respekt im Chat', text: 'Kein Drama, keine Beleidigungen. Kritik ja, aber freundlich und unter vier Augen.' },
    { title: 'Jede Rolle zählt', text: 'Tanks und Heiler sind gefragt, aber ein Run braucht genauso gute Schadensverursacher.' },
  ],
  activities: [
    { title: 'Dungeon-Runs', text: 'Fast jeden Abend über den Dungeon-Finder dieser Seite geplant – von Stufe 13 bis 60.' },
    { title: 'Raids', text: 'Sobald genug Mitglieder Stufe 60 erreicht haben, planen wir feste Raid-Abende.' },
    { title: 'Community-Abende', text: 'Gildentreffen, Angelwettbewerbe und gemeinsames Stream-Schauen auf Discord.' },
  ],
  focus: {
    pve: 'Unser Schwerpunkt liegt auf PvE: Leveln, Dungeons und später Raids.',
    dungeons: 'Alle Dungeons inklusive der neuen aus WoW: Forever, mit Gruppen für jede Stufe.',
    raids: 'Raidplanung startet mit den ersten Stufe-60-Charakteren. Termine stehen im Kalender.',
  },
  contacts: [
    { role: 'Gildenleitung', name: 'Ansprechpartner folgt', isPlaceholder: true },
    { role: 'Raidleitung', name: 'Ansprechpartner folgt', isPlaceholder: true },
    { role: 'Webseite', name: 'Dustin', isPlaceholder: false },
  ],
}
