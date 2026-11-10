import { expect, test } from '@playwright/test'
import { gotoReady } from './support/helpers'

test.describe('Live-Hinweis im Header (Demo)', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'wow-guild-demo-live', value: '1', url: baseURL! }])
  })

  test('erscheint auf Unterseiten, nicht auf der Startseite, und lässt sich ausblenden', async ({ page }) => {
    await gotoReady(page, '/')
    await expect(page.getByText('Miinyu ist live').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Live-Hinweis ausblenden' })).toHaveCount(0)

    await gotoReady(page, '/kalender')
    const link = page.getByRole('link', { name: /Miinyu ist live.*Zuschauen/ })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('target', '_blank')

    await page.getByRole('button', { name: 'Live-Hinweis ausblenden' }).click()
    await expect(link).toHaveCount(0)
    // bleibt für diese Sitzung ausgeblendet
    await gotoReady(page, '/gilde')
    await expect(page.getByRole('link', { name: /Miinyu ist live.*Zuschauen/ })).toHaveCount(0)
  })

  test('Startseite zeigt eine große Stream-Vorschau, die zu Twitch führt', async ({ page }) => {
    await gotoReady(page, '/')
    const preview = page.getByRole('link', { name: /Miinyu ist gerade live/ })
    await expect(preview).toBeVisible()
    await expect(preview).toHaveAttribute('href', /twitch\.tv/)
    await expect(preview).toHaveAttribute('target', '_blank')
    await expect(preview.getByText('321 Zuschauer')).toBeVisible()
  })

  test('ohne Livestream kein Hinweis', async ({ page, context }) => {
    await context.clearCookies()
    await gotoReady(page, '/kalender')
    await expect(page.getByRole('button', { name: 'Live-Hinweis ausblenden' })).toHaveCount(0)
    await gotoReady(page, '/')
    await expect(page.getByRole('link', { name: /Miinyu ist gerade live/ })).toHaveCount(0)
  })
})
