import { expect, test, type BrowserContext } from '@playwright/test'
import { gotoReady } from './support/helpers'

const PERSONA_COOKIE = 'wow-guild-demo-persona'

async function asPersona(context: BrowserContext, baseURL: string | undefined, persona: string) {
  await context.addCookies([{ name: PERSONA_COOKIE, value: persona, url: baseURL! }])
}

test.describe('Dungeon-Katalog', () => {
  test('sucht und filtert Dungeons', async ({ page }) => {
    await gotoReady(page, '/dungeons')
    const cards = page.locator('.dungeon-card')
    await expect(cards).toHaveCount(35)

    await page.getByRole('searchbox', { name: 'Dungeon' }).fill('todesminen')
    await expect(cards).toHaveCount(1)
    await expect(page).toHaveURL(/q=todesminen/)

    await page.getByRole('button', { name: 'Filter zurücksetzen' }).first().click()
    // Erst weiter, wenn das Zurücksetzen in der URL angekommen ist (sonst überschreibt es die Eingabe)
    await expect(page).not.toHaveURL(/q=/)
    await page.getByLabel('Für Stufe').fill('60')
    await page.getByLabel('Für Stufe').blur()
    await expect.poll(() => cards.count()).toBeLessThan(35)

    await page.getByRole('button', { name: 'Filter zurücksetzen' }).first().click()
    await expect(page).not.toHaveURL(/stufe=|level=/)
    await page.getByLabel('Nur mit geplanten Gruppen').check()
    await expect(page.getByRole('heading', { name: 'Die Todesminen' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Gnomeregan' })).toHaveCount(0)
  })

  test('Dungeon-Detail zeigt Quellen und geplante Gruppen', async ({ page }) => {
    await page.goto('/dungeons/hall-of-thanes')
    await expect(page.getByRole('heading', { level: 1, name: 'Halle der Thane' })).toBeVisible()
    await expect(page.getByText('Neu in WoW: Forever')).toBeVisible()
    await expect(page.getByText('nicht belegt')).toBeVisible()
    await expect(page.getByRole('link', { name: /Warcraft Tavern/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Erstbesuch: Halle der Thane' })).toBeVisible()
  })

  test('unbekannte Dungeons liefern 404', async ({ page }) => {
    const response = await page.goto('/dungeons/gibt-es-nicht')
    expect(response?.status()).toBe(404)
  })
})

test.describe('Gruppenplaner (Demo)', () => {
  test('beitreten, Neuladen übersteht die Anmeldung, wieder abmelden', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'admin') // Frostblüte: Eisblume (Priester 60), Raureif (Magier 34)
    await page.goto('/gruppen/demo-run-01')
    await page.getByRole('button', { name: 'Gruppe beitreten' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('radio', { name: /Eisblume/ }).check()
    // Stufe 60 in Todesminen (15–22): erlaubt, aber mit Hinweis
    await expect(dialog.getByText(/über dem empfohlenen Bereich/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Beitreten' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Du bist dabei' })).toContainText('Eisblume Frostweber als Heiler')
    await expect(page.locator('.group-page__status')).toHaveText('1 Platz frei')

    await page.reload()
    await expect(page.getByText('Du bist dabei als')).toBeVisible()

    await page.getByRole('button', { name: 'Abmelden' }).click()
    await expect(page.getByRole('button', { name: 'Gruppe beitreten' })).toBeVisible()
  })

  test('blockiert Charaktere unter der Mindeststufe mit Begründung', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'admin')
    await page.goto('/gruppen/demo-run-05') // Stratholme, Mindeststufe 45
    await page.getByRole('button', { name: 'Gruppe beitreten' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('radio', { name: /Raureif/ }).check()
    await expect(dialog.getByText('Für Stratholme: Lebend ist mindestens Stufe 45 nötig (aktuell 34).')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Beitreten' })).toBeDisabled()
  })

  test('volle Rolle mit Warteliste (als Supporter)', async ({ page }) => {
    await page.goto('/gruppen/demo-run-02') // voll, Warteliste erlaubt, ein DD-Supporter
    await page.getByRole('button', { name: 'Gruppe beitreten' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('radio', { name: /Als Supporter/ }).check()
    await dialog.getByRole('button', { name: 'Auf die Warteliste' }).click()
    await expect(page.getByText('Du stehst auf der Warteliste als')).toBeVisible()
  })

  test('feste Anmeldung verdrängt einen Supporter auf die Warteliste', async ({ page }) => {
    await page.goto('/gruppen/demo-run-02')
    const participants = page.getByRole('region', { name: 'Teilnehmer' })
    await expect(participants.getByText('Supporter', { exact: true })).toHaveCount(1)

    await page.getByRole('button', { name: 'Gruppe beitreten' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('radio', { name: /Fest dabei/ })).toBeChecked()
    await expect(dialog.getByText('Supporter macht Platz')).toBeVisible()
    await dialog.getByRole('button', { name: 'Beitreten' }).click()
    await expect(page.getByText('Du bist dabei als')).toBeVisible()

    // Windhauch (Supporter) steht jetzt auf der Warteliste
    const waitlist = participants.getByRole('heading', { name: 'Warteliste' }).locator('xpath=..')
    await expect(waitlist.getByText('Windhauch Wolkenreiter')).toBeVisible()
    await expect(waitlist.getByText('Supporter', { exact: true })).toBeVisible()
  })

  test('Organisator erstellt, bearbeitet und sagt eine Gruppe ab', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'organizer')
    await page.goto('/dungeons/the-stockade')
    await page.getByRole('button', { name: 'Gruppe erstellen' }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Dungeon oder Raid')).toHaveValue('the-stockade')
    await dialog.getByLabel('Titel').fill('E2E-Verlies')
    // Zu viele Plätze werden mit Begründung abgelehnt
    await dialog.getByLabel('Schadensverursacher').fill('5')
    await dialog.getByRole('button', { name: 'Gruppe erstellen' }).click()
    await expect(dialog.getByRole('alert')).toHaveText('Das Verlies ist für höchstens 5 Spieler ausgelegt.')
    await dialog.getByLabel('Schadensverursacher').fill('3')
    await dialog.getByRole('button', { name: 'Gruppe erstellen' }).click()

    await expect(page).toHaveURL(/\/gruppen\/demo-run-/)
    await expect(page.getByRole('heading', { level: 1, name: 'E2E-Verlies' })).toBeVisible()

    await page.getByRole('button', { name: 'Bearbeiten' }).click()
    await page.getByRole('dialog').getByLabel('Titel').fill('E2E-Verlies (verschoben)')
    await page.getByRole('dialog').getByRole('button', { name: 'Änderungen speichern' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'E2E-Verlies (verschoben)' })).toBeVisible()

    await page.getByRole('button', { name: 'Gruppe absagen' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Gruppe absagen' }).click()
    await expect(page.locator('.group-page__status')).toHaveText('Abgesagt')
    await expect(page.getByRole('button', { name: 'Bearbeiten' })).toHaveCount(0)

    // Die neue Gruppe erscheint in der Liste (abgesagte nur auf Wunsch)
    await page.goto('/gruppen?abgesagt=1')
    await expect(page.getByRole('link', { name: 'E2E-Verlies (verschoben)' })).toBeVisible()
  })

  test('Organisator plant Quests für die Gruppe', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'organizer')
    await page.goto('/dungeons/the-stockade')
    await page.getByRole('button', { name: 'Gruppe erstellen' }).first().click()

    const dialog = page.getByRole('dialog')
    const quests = dialog.getByRole('group', { name: /Geplante Quests/ })
    await expect(quests.getByRole('checkbox')).toHaveCount(6)
    await quests.getByLabel('Verbrechen und Strafe').check()
    await quests.getByLabel('Aufstand im Verlies').check()
    await dialog.getByLabel('Titel').fill('E2E-Questrun')
    await dialog.getByRole('button', { name: 'Gruppe erstellen' }).click()

    await expect(page).toHaveURL(/\/gruppen\/demo-run-/)
    const planned = page.getByRole('region', { name: 'Geplante Quests' })
    await expect(planned.getByRole('listitem')).toHaveText(['Verbrechen und Strafe', 'Aufstand im Verlies'])

    // Beim Bearbeiten sind die Haken gesetzt; „Alle auswählen“ hakt den Rest an
    await page.getByRole('button', { name: 'Bearbeiten' }).click()
    const edit = page.getByRole('dialog').getByRole('group', { name: /Geplante Quests/ })
    await expect(edit.getByLabel('Verbrechen und Strafe')).toBeChecked()
    await edit.getByRole('button', { name: 'Alle auswählen' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Änderungen speichern' }).click()
    await expect(planned.getByRole('listitem')).toHaveCount(6)
  })

  test('Mitglieder können fremde Gruppen nicht bearbeiten', async ({ page }) => {
    await page.goto('/gruppen/demo-run-01') // organisiert von Brummbart, Ansicht als Nebelpfote
    await expect(page.getByRole('button', { name: 'Bearbeiten' })).toHaveCount(0)
  })
})

test.describe('Datenschutz im Gruppenplaner', () => {
  test('Besucher sehen Besetzung, aber nicht wer teilnimmt', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'visitor')
    await page.goto('/gruppen/demo-run-01')
    await expect(page.getByRole('list', { name: 'Besetzung' })).toBeVisible()
    await expect(page.getByText('Wer teilnimmt, sehen nur Gildenmitglieder.')).toBeVisible()
    await expect(page.getByText('Hammerherz')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Gruppe beitreten' })).toHaveCount(0)

    const runs = await (await page.request.get('/api/runs')).json() as { organizerId: string, participants: { memberId: string }[] }[]
    expect(runs.every(run => run.organizerId === 'hidden')).toBe(true)
    expect(runs.flatMap(run => run.participants).every(entry => entry.memberId.startsWith('anon'))).toBe(true)
    expect((await page.request.get('/api/me/characters')).status()).toBe(401)
  })
})
