import { expect, test, type BrowserContext } from '@playwright/test'

const PERSONA_COOKIE = 'wow-guild-demo-persona'

async function asPersona(context: BrowserContext, baseURL: string | undefined, persona: string) {
  await context.addCookies([{ name: PERSONA_COOKIE, value: persona, url: baseURL! }])
}

test.describe('Charakter-Onboarding & Einstellungen (Demo)', () => {
  test('neues Mitglied trägt den Hauptcharakter ein und pflegt Twinks', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'newcomer')
    await page.goto('/einstellungen')

    // Pflicht-Dialog erscheint automatisch
    const onboarding = page.getByRole('dialog', { name: 'Willkommen, Funkelzahn!' })
    await expect(onboarding).toBeVisible()
    await onboarding.getByLabel('Vorname').fill('ambosshieb')
    await onboarding.getByLabel('Nachname').fill('Glutbart')
    await onboarding.getByLabel('Volk').selectOption({ label: 'Zwerg' })
    await onboarding.getByLabel('Klasse').selectOption({ label: 'Paladin' })
    await onboarding.getByLabel('Stufe').fill('14')
    await onboarding.getByRole('checkbox', { name: 'Tank' }).check()
    await onboarding.getByRole('button', { name: 'Hauptcharakter speichern' }).click()
    await expect(onboarding).toBeHidden()

    const list = page.locator('.settings-page__list')
    await expect(list.getByRole('heading', { name: 'Ambosshieb Glutbart' })).toBeVisible()
    await expect(list.getByText('Hauptcharakter')).toBeVisible()

    // Twink hinzufügen – Klassen passen zum Volk
    await page.getByRole('button', { name: 'Twink hinzufügen' }).click()
    const form = page.getByRole('dialog', { name: 'Charakter hinzufügen' })
    await form.getByLabel('Vorname').fill('Ambosshieb')
    await form.getByLabel('Nachname').fill('Glutbart')
    await form.getByLabel('Volk').selectOption({ label: 'Gnom' })
    await expect(form.getByLabel('Klasse').locator('option', { hasText: 'Paladin' })).toHaveCount(0)
    await form.getByLabel('Klasse').selectOption({ label: 'Magier' })
    await form.getByLabel('Stufe').fill('5')
    await form.getByRole('button', { name: 'Charakter speichern' }).click()
    await expect(form.getByRole('alert')).toContainText('bereits einen Charakter namens Ambosshieb Glutbart')
    await form.getByLabel('Nachname').fill('Zahnradfunke')
    await form.getByRole('button', { name: 'Charakter speichern' }).click()
    await expect(form).toBeHidden()
    await expect(list.getByRole('heading', { name: 'Ambosshieb Zahnradfunke' })).toBeVisible()

    // Hauptcharakter wechseln, übersteht Neuladen
    await page.getByRole('button', { name: 'Ambosshieb Zahnradfunke als Hauptcharakter festlegen' }).click()
    await expect(page.locator('.settings-page__notice')).toContainText('Ambosshieb Zahnradfunke ist jetzt dein Hauptcharakter')
    await page.reload()
    await expect(list.locator('.character-card').first()).toContainText('Zahnradfunke')

    // Löschen
    await page.getByRole('button', { name: 'Ambosshieb Glutbart löschen' }).click()
    await page.getByRole('dialog', { name: 'Charakter löschen?' }).getByRole('button', { name: 'Löschen' }).click()
    await expect(list.getByRole('heading', { name: 'Ambosshieb Glutbart' })).toHaveCount(0)
  })

  test('„Später“ blendet das Onboarding für die Sitzung aus', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'newcomer')
    await page.goto('/')
    const onboarding = page.getByRole('dialog', { name: /Willkommen/ })
    await expect(onboarding).toBeVisible()
    await onboarding.getByRole('button', { name: 'Später' }).click()
    await expect(onboarding).toBeHidden()
    await page.goto('/gilde')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('dialog', { name: /Willkommen/ })).toHaveCount(0)
  })

  test('Mitglieder mit Charakteren sehen kein Onboarding, Besucher werden zur Anmeldung geführt', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'member')
    await page.goto('/einstellungen')
    await expect(page.locator('.settings-page__list .character-card').first()).toBeVisible()
    await expect(page.getByRole('dialog', { name: /Willkommen/ })).toHaveCount(0)

    await asPersona(context, baseURL, 'visitor')
    await page.goto('/einstellungen')
    await expect(page.getByRole('heading', { name: 'Bitte melde dich an' })).toBeVisible()
  })

  test('Benutzermenü führt zu den Einstellungen', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'member')
    await page.goto('/')
    await page.locator('.user-menu__trigger').click()
    await page.getByRole('link', { name: 'Meine Charaktere' }).click()
    await expect(page).toHaveURL(/\/einstellungen$/)
  })
})
