export interface NavItem {
  label: string
  to: string
}

/** Hauptnavigation – Reihenfolge = Darstellung. */
export const mainNavigation: readonly NavItem[] = [
  { label: 'Start', to: '/' },
  { label: 'Gilde', to: '/gilde' },
  { label: 'Mitglieder', to: '/mitglieder' },
  { label: 'Rangliste', to: '/rangliste' },
  { label: 'Dungeons', to: '/dungeons' },
  { label: 'Kalender', to: '/kalender' },
  { label: 'Clips', to: '/clips' },
  { label: 'Regeln', to: '/regeln' },
]

export const legalNavigation: readonly NavItem[] = [
  { label: 'Impressum', to: '/impressum' },
  { label: 'Datenschutz', to: '/datenschutz' },
]
