import { expect, test } from '@playwright/test'
import { asPersona, gotoReady } from './support/helpers'

/** Tag des vergangenen Demo-Streams (vorgestern, 18 Uhr UTC) im Format der Kalender-URL */
function pastStreamDay() {
  const now = new Date()
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 2 * 86_400_000)
  const key = day.toISOString().slice(0, 10)
  return { month: key.slice(0, 7), day: key }
}

test.describe('Vergangene Discord-Events (Demo)', () => {
  test('bleiben im Kalender und verlinken die Aufzeichnung', async ({ page }) => {
    const { month, day } = pastStreamDay()
    await gotoReady(page, `/kalender?monat=${month}&tag=${day}`)
    await expect(page.getByRole('link', { name: /Aufzeichnung von „Stream: Erster Dungeon-Abend“/ })).toBeVisible()

    await page.getByRole('button', { name: 'Stream: Erster Dungeon-Abend' }).last().click()
    const dialog = page.getByRole('dialog', { name: 'Stream: Erster Dungeon-Abend' })
    await expect(dialog.getByRole('link', { name: /Aufzeichnung ansehen/ })).toHaveAttribute('href', /twitch\.tv/)
    // Mitglieder dürfen Discord-Events nicht absagen
    await expect(dialog.getByRole('button', { name: 'Absagen' })).toHaveCount(0)
  })

  test('Admins können ein Discord-Event auf der Seite absagen und das zurücknehmen', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'admin')
    const { month, day } = pastStreamDay()
    await gotoReady(page, `/kalender?monat=${month}&tag=${day}`)
    await page.getByRole('button', { name: 'Stream: Erster Dungeon-Abend' }).last().click()
    const dialog = page.getByRole('dialog', { name: 'Stream: Erster Dungeon-Abend' })

    await dialog.getByRole('button', { name: 'Absagen' }).click()
    await expect(dialog.getByText('In Discord selbst ändert sich dadurch nichts.')).toBeVisible()
    await dialog.getByLabel(/Grund/).fill('Stream fiel aus')
    await dialog.getByRole('button', { name: 'Ja, absagen' }).click()
    await expect(dialog.getByText('Abgesagt – Stream fiel aus')).toBeVisible()
    await expect(dialog.getByRole('link', { name: /Aufzeichnung ansehen/ })).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Absage zurücknehmen' }).click()
    await expect(dialog.getByText('Abgeschlossen')).toBeVisible()
  })
})
