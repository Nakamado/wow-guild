import { expect, test } from '@playwright/test'
import { asPersona, gotoReady } from './support/helpers'

test.describe('Charaktervergleich (Demo)', () => {
  test('vom Profil aus zwei Charaktere vergleichen', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'member')
    await gotoReady(page, '/charaktere/demo-char-01')
    await page.getByRole('link', { name: 'Vergleichen' }).click()
    await expect(page).toHaveURL(/\/charaktere\/vergleich\?a=demo-char-01/)
    await expect(page.getByRole('heading', { name: 'Wähle zwei Charaktere aus' })).toBeVisible()

    await page.getByLabel('Charakter 2').selectOption('demo-char-02')
    await expect(page).toHaveURL(/b=demo-char-02/)
    const overview = page.getByRole('region', { name: 'Überblick' })
    await expect(overview.getByRole('link', { name: 'Eisblume Frostweber' })).toBeVisible()
    await expect(overview.getByRole('link', { name: 'Raureif Kurbelzahn' })).toBeVisible()
    // Stufe 60 gegen 34
    await expect(overview.getByRole('row', { name: /^Stufe/ })).toContainText('+26 für Eisblume Frostweber')
    await expect(overview.getByRole('row', { name: /Punkte gesamt/ })).toBeVisible()

    await page.getByRole('button', { name: 'Tauschen' }).click()
    await expect(page).toHaveURL(/a=demo-char-02&b=demo-char-01/)
  })

  test('Besucher sehen keine Charakterdaten', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'visitor')
    await gotoReady(page, '/charaktere/vergleich?a=demo-char-01&b=demo-char-02')
    await expect(page.getByLabel('Charakter 1')).toHaveCount(0)
    const response = await page.request.get('/api/characters/compare?a=demo-char-01&b=demo-char-02')
    expect([401, 403]).toContain(response.status())
  })
})
