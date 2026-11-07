import type { GuildContent } from '../shared/schemas/content'

/**
 * Texte für Startseite und Gildenseite.
 * Zum Bearbeiten einfach die Strings ändern – die Struktur wird per Test geprüft.
 */
export const guildContent: GuildContent = {
  isDraft: false,
  tagline: 'Eine Allianz-Gilde, in der man zusammenhält und sich gegenseitig hilft – egal, in welchem Tempo du levelst.',
  intro: [
    'Wir sind die Gilde aus Miinyus Community für WoW: Forever. Ob du so schnell wie möglich auf Stufe 60 willst oder dir lieber Zeit lässt: Bei uns hilft man sich gegenseitig, und niemand steht allein vor der Instanz.',
    'Ob du zum ersten Mal Classic spielst oder jeden Winkel der Todesminen kennst: Du findest hier Leute für Dungeons, Raids und alles dazwischen.',
  ],
  values: [
    { title: 'Zusammenhalt', text: 'Wir helfen uns gegenseitig – mit Tipps zu Bossen, Material für Berufe oder einer helfenden Hand bei schweren Quests. Teil der Community bist du in jedem Tempo.' },
    { title: 'Respekt im Chat', text: 'Kein Drama, keine Beleidigungen. Kritik ja, aber freundlich und unter vier Augen.' },
    { title: 'Jede Rolle zählt', text: 'Tanks und Heiler sind gefragt, aber ein Run braucht genauso gute Schadensverursacher.' },
  ],
  activities: [
    {
      title: 'Dungeon-Runs',
      text: 'Eine Gruppe findest du jederzeit – im Gildenchat im Spiel, in unserem Discord oder über den Dungeon-Finder dieser Seite.',
      links: [
        { label: 'Zum Dungeon-Finder', to: '/gruppen' },
        { label: 'Zum Discord-Kanal #wow-forever', to: 'https://discord.com/channels/723275162971275335/1562460291672051822' },
      ],
    },
    { title: 'Raids', text: 'Sobald genug Mitglieder Stufe 60 erreicht haben, planen wir feste Raid-Abende.' },
    { title: 'Community-Abende', text: 'Für die Zukunft können wir uns Gildentreffen, Angelwettbewerbe oder Ähnliches vorstellen. Ihr könnt gerne Sachen vorschlagen.' },
  ],
  focus: {
    pve: 'Unser Schwerpunkt liegt auf PvE: Leveln, Dungeons und später Raids.',
    dungeons: 'Alle Dungeons inklusive der neuen aus WoW: Forever, mit Gruppen für jede Stufe.',
    raids: 'Raidplanung startet mit den ersten Stufe-60-Charakteren. Termine stehen im Kalender.',
  },
  contacts: [
    // Erste Anlaufstelle: Kanal #wow-forever auf Miinyus Discord (Link funktioniert nur für Server-Mitglieder)
    { role: 'Fragen zur Gilde', name: '#wow-forever', isPlaceholder: false, url: 'https://discord.com/channels/723275162971275335/1562460291672051822' },
    { role: 'Gildenleitung', name: 'Minyu', isPlaceholder: false, discordUserId: '291187664994959360' },
    { role: 'Raidleitung', name: 'Ansprechpartner folgt', isPlaceholder: true },
    // discordUserId: Discord → Rechtsklick aufs Profil → „Nutzer-ID kopieren“ – der Name verlinkt dann aufs Profil
    { role: 'Webseite', name: 'Nakamado', isPlaceholder: false, discordUserId: '591736149647687697' },
  ],
}
