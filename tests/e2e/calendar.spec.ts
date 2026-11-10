import { expect, test } from '@playwright/test'

const PERSONA_COOKIE = 'wow-guild-demo-persona'

test.describe('Eventkalender', () => {
  test('Monatsansicht zeigt Termine beider Quellen ohne Duplikate', async ({ page }) => {
    await page.goto('/kalender')
    await expect(page.getByRole('heading', { level: 2, name: /\d{4}/ })).toBeVisible()
    // Discord-Event und Webseiten-Run sichtbar; das per Bot angekündigte Duplikat nicht
    await page.getByRole('button', { name: 'Liste' }).click()
    await expect(page.getByRole('button', { name: 'Gildentreffen in Eisenschmiede' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Erstbesuch: Halle der Thane' })).toBeVisible()
    await expect(page.getByText('Halle der Thane – Gilden-Run')).toHaveCount(0)
  })

  test('Filter nach Art und Abgesagte', async ({ page }) => {
    await page.goto('/kalender?ansicht=liste')
    await page.getByRole('group', { name: 'Art des Termins' }).getByRole('button', { name: 'Raids' }).click()
    await expect(page).toHaveURL(/typ=raid/)
    await expect(page.getByRole('button', { name: 'Erster Raidabend: Barrow Deeps' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gildentreffen in Eisenschmiede' })).toHaveCount(0)

    await page.getByRole('group', { name: 'Art des Termins' }).getByRole('button', { name: 'Alle' }).click()
    await expect(page.getByText('Rätselabend')).toHaveCount(0)
    await page.getByLabel('Abgesagte zeigen').check()
    await expect(page.getByText('Rätselabend')).toBeVisible()
  })

  test('Monatsnavigation und Tagesauswahl', async ({ page }) => {
    await page.goto('/kalender?monat=2026-11')
    await expect(page.getByRole('heading', { level: 2, name: 'November 2026' })).toBeVisible()
    await page.getByRole('button', { name: 'Nächster Monat' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Dezember 2026' })).toBeVisible()
    await expect(page).toHaveURL(/monat=2026-12/)

    await page.getByRole('button', { name: /^Donnerstag, 10\. Dezember/ }).click()
    await expect(page.getByRole('heading', { name: 'Donnerstag, 10. Dezember' })).toBeVisible()
  })

  test('Details zeigen Besetzung und erlauben die Anmeldung', async ({ page }) => {
    await page.goto('/kalender?ansicht=liste') // Ansicht als Nebelpfote (Mitglied)
    await page.getByRole('button', { name: 'Bibliothek mit Lehrlingen' }).click()
    const details = page.getByRole('dialog', { name: 'Bibliothek mit Lehrlingen' })
    await expect(details.getByText('Voll – Warteliste offen')).toBeVisible()
    await expect(details.getByRole('list', { name: 'Besetzung' })).toBeVisible()
    await details.getByRole('button', { name: 'Beitreten' }).click()

    const signup = page.getByRole('dialog', { name: 'Gruppe beitreten' })
    // als Supporter verdrängt man niemanden – also Warteliste
    await signup.getByRole('radio', { name: /Als Supporter/ }).check()
    await signup.getByRole('button', { name: 'Auf die Warteliste' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Warteliste' })).toContainText('steht auf der Warteliste')
  })

  test('neu geplante Gruppe erscheint im Kalender und auf der Startseite', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: PERSONA_COOKIE, value: 'organizer', url: baseURL! }])
    await page.goto('/kalender')
    await page.getByRole('button', { name: 'Gruppe planen' }).first().click()
    const form = page.getByRole('dialog', { name: 'Gruppe erstellen' })
    await form.getByLabel('Dungeon oder Raid').selectOption('gnomeregan')
    await form.getByLabel('Titel').fill('Kalender-Test Gnomeregan')
    await form.getByRole('button', { name: 'Gruppe erstellen' }).click()
    await expect(page).toHaveURL(/\/gruppen\/demo-run-/)

    await page.goto('/kalender?ansicht=liste')
    await expect(page.getByRole('button', { name: 'Kalender-Test Gnomeregan' })).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Kalender-Test Gnomeregan' })).toBeVisible()
  })

  test('Besucher sehen keine Veranstalter-Namen', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: PERSONA_COOKIE, value: 'visitor', url: baseURL! }])
    await page.goto('/kalender?ansicht=liste')
    await page.getByRole('button', { name: 'Gildentreffen in Eisenschmiede' }).click()
    const details = page.getByRole('dialog', { name: 'Gildentreffen in Eisenschmiede' })
    await expect(details.getByText('Geplant')).toBeVisible()
    await expect(details.getByText('Veranstaltet von')).toHaveCount(0)
    await expect(details.getByRole('button', { name: 'Beitreten' })).toHaveCount(0)
  })
})
