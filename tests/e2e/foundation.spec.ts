import { expect, test } from '@playwright/test'

test.describe('Grundgerüst', () => {
  test('Startseite lädt mit Titel, Demo-Hinweis und Discord-CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/MukiMuki/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Demo-Hinweis' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Discord beitreten/ }).first())
      .toHaveAttribute('href', /discord\.gg/)
  })

  test('Skip-Link springt zum Hauptinhalt', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Zum Inhalt springen' })
    await expect(skip).toBeFocused()
    await skip.press('Enter')
    await expect(page).toHaveURL(/#main$/)
  })

  test('Rechtsseiten sind erreichbar', async ({ page }) => {
    for (const [path, title] of [['/impressum', 'Impressum'], ['/datenschutz', 'Datenschutz']]) {
      await page.goto(path!)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    }
  })

  test('unbekannte Seiten zeigen eine 404-Seite', async ({ page }) => {
    const response = await page.goto('/gibt-es-nicht')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('404')).toBeVisible()
    await page.getByRole('button', { name: 'Zur Startseite' }).click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('Navigation', () => {
  test('Desktop-Navigation führt zu den Bereichen', async ({ page, isMobile }) => {
    test.skip(isMobile, 'nur Desktop')
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    await nav.getByRole('link', { name: 'Dungeons' }).click()
    await expect(page).toHaveURL('/dungeons')
    await expect(page.getByRole('heading', { level: 1, name: 'Dungeon-Finder' })).toBeVisible()
  })

  test('mobiles Menü öffnet, navigiert und schließt per Escape', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'nur Mobil')
    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Menü öffnen' })
    await toggle.click()
    await expect(page.getByRole('button', { name: 'Menü schließen' })).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Menü öffnen' })).toHaveAttribute('aria-expanded', 'false')

    await page.getByRole('button', { name: 'Menü öffnen' }).click()
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Kalender' }).click()
    await expect(page).toHaveURL('/kalender')
    await expect(page.getByRole('button', { name: 'Menü öffnen' })).toBeVisible()
  })
})
