import { expect, test } from '@playwright/test'
import { asPersona, gotoReady } from './support/helpers'

test.describe('Benachrichtigungen (Demo)', () => {
  test('Glocke zeigt Ungelesenes und markiert beim Öffnen als gelesen', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'member')
    await gotoReady(page, '/')
    const bell = page.getByRole('button', { name: 'Benachrichtigungen, 2 ungelesen' })
    await expect(bell).toBeVisible()
    await bell.click()

    await expect(page.getByText('Thorgrimm Ambossfaust hat sich für „Erstbesuch: Halle der Thane“ angemeldet (Tank).')).toBeVisible()
    await expect(page.getByText('„Stratholme: Lebend“ wurde abgesagt – Zu wenig Anmeldungen.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Benachrichtigungen', exact: true })).toBeVisible()

    await page.getByRole('link', { name: /von der Warteliste nachgerückt/ }).click()
    await expect(page).toHaveURL(/\/gruppen\/demo-run-02/)
  })

  test('Besucher sehen keine Glocke', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'visitor')
    await gotoReady(page, '/')
    await expect(page.getByRole('button', { name: /^Benachrichtigungen/ })).toHaveCount(0)
  })
})
