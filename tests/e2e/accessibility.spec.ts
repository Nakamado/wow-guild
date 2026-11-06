import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { asPersona, gotoReady } from './support/helpers'

/**
 * Automatische Barrierefreiheits-Prüfung (axe-core, WCAG 2.1 AA) der wichtigsten Seiten.
 * Gemeldet werden nur ernste und kritische Verstöße – kleinere Hinweise prüft man von Hand.
 */
const pages = [
  { path: '/', persona: 'visitor' },
  { path: '/gilde', persona: 'visitor' },
  { path: '/regeln', persona: 'visitor' },
  { path: '/mitglieder', persona: 'member' },
  { path: '/rangliste', persona: 'visitor' },
  { path: '/dungeons', persona: 'member' },
  { path: '/dungeons/the-deadmines', persona: 'member' },
  { path: '/gruppen', persona: 'member' },
  { path: '/gruppen/demo-run-01', persona: 'member' },
  { path: '/kalender', persona: 'member' },
  { path: '/clips', persona: 'visitor' },
  { path: '/streamer', persona: 'member' },
  { path: '/einstellungen', persona: 'member' },
  { path: '/impressum', persona: 'visitor' },
]

for (const { path, persona } of pages) {
  test(`keine ernsten a11y-Verstöße: ${path} (${persona})`, async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, persona)
    await gotoReady(page, path)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const serious = results.violations
      .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
      .map(violation => `${violation.id}: ${violation.help} → ${violation.nodes.map(node => node.target.join(' ')).slice(0, 3).join(' | ')}`)
    expect(serious, serious.join('\n')).toEqual([])
  })
}

test('Dialoge sind per Tastatur bedienbar und schließen mit Escape', async ({ page, context, baseURL }) => {
  await asPersona(context, baseURL, 'member')
  await gotoReady(page, '/einstellungen')
  await page.getByRole('button', { name: 'Twink hinzufügen' }).click()
  const dialog = page.getByRole('dialog', { name: 'Charakter hinzufügen' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Vorname')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})
