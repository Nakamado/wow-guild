import type { RulesContent } from '../shared/schemas/content'

/**
 * BEISPIELREGELN – werden ersetzt, sobald Miinyus offizielle Gildenregeln feststehen.
 * Solange `isExample: true` gesetzt ist, zeigt die Seite einen deutlichen Hinweis.
 */
export const rulesContent: RulesContent = {
  isExample: true,
  updatedAt: '2026-11-04',
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
        'Stream-Sniping und das Verraten von Positionen im Stream sind tabu.',
        'Was im Discord besprochen wird, bleibt im Discord – keine Screenshots ohne Zustimmung.',
      ],
    },
  ],
}
