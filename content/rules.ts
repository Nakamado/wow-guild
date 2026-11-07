import type { RulesContent } from '../shared/schemas/content'

/**
 * Gildenregeln. Mit `isExample: false` zeigt die Seite einen Hinweis „Beispielregeln“.
 * Bei inhaltlichen Änderungen `updatedAt` anpassen.
 */
export const rulesContent: RulesContent = {
  isExample: false,
  updatedAt: '2026-11-07',
  intro: 'Damit sich alle wohlfühlen, gelten in Gilde, Discord und auf dieser Seite ein paar einfache Regeln.',
  sections: [
    {
      id: 'miteinander',
      title: 'Miteinander',
      rules: [
        'Wir gehen freundlich und respektvoll miteinander um – im Gildenchat, im Discord und in Gruppen.',
        'Beleidigungen, Diskriminierung und Belästigung führen zum Ausschluss.',
        'Konflikte klären wir privat oder mit der Gildenleitung, nicht im öffentlichen Chat.',
      ],
    },
    {
      id: 'gruppen',
      title: 'Gruppen und Runs',
      rules: [
        'Wer sich für einen Run anmeldet, ist pünktlich da oder meldet sich rechtzeitig ab.',
        'Die Organisatorin oder der Organisator eines Runs legt Ablauf und Lootregeln vorher fest.',
        'Neue Spielerinnen und Spieler bekommen Zeit und Erklärungen – niemand wird für Fehler angefahren.',
      ],
    },
    {
      id: 'loot',
      title: 'Beute',
      rules: [
        'In Dungeons gilt „Bedarf vor Gier“, sofern vorher nichts anderes abgesprochen wurde.',
        'Für Raids gilt das Lootsystem, das die Raidleitung vorab bekannt gibt.',
      ],
    },
    {
      id: 'stream',
      title: 'Stream und Community',
      rules: [
        'Stream-Sniping und das Verraten von Positionen im Chat sind nur tabu, wenn Miinyu oder ein anderer Gilden-Streamer das im Stream ansagt. Sonst darfst du im Spiel gern vorbeischauen.',
        'Was im Discord besprochen wird, bleibt im Discord – keine Screenshots ohne Zustimmung.',
      ],
    },
  ],
}
