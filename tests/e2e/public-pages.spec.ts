import { gotoReady } from './support/helpers'
import { expect, test } from '@playwright/test'

const PERSONA_COOKIE = 'wow-guild-demo-persona'

test.describe('Mitglieder & Datenschutz', () => {
  test('Besucher sehen keine Mitgliederliste, Mitglieder schon', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: PERSONA_COOKIE, value: 'visitor', url: baseURL! }])
    await page.goto('/mitglieder')
    await expect(page.getByText('Mitglieder sehen mehr')).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)

    // Die API verweigert den Zugriff serverseitig
    const response = await page.request.get('/api/members')
    expect(response.status()).toBe(401)

    // Demo-Rolle wechseln → Liste erscheint ohne Neuladen
    await page.getByLabel('Ansicht als').selectOption('member')
    await expect(page.getByRole('table').getByRole('link', { name: 'Brummbart' }).first()).toBeVisible()
  })

  test('Rollenwechsel bleibt nach dem Neuladen erhalten', async ({ page }) => {
    await page.goto('/mitglieder')
    await page.getByLabel('Ansicht als').selectOption('visitor')
    await expect(page.getByText('Mitglieder sehen mehr')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Mitglieder sehen mehr')).toBeVisible()
    await expect(page.getByLabel('Ansicht als')).toHaveValue('visitor')
  })

  test('Charaktertabelle sortiert per Spaltenüberschrift, Berufe inklusive', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Sortierlogik einmal genügt')
    await gotoReady(page, '/mitglieder')
    const table = page.getByRole('table')
    const firstName = () => table.locator('tbody tr').first().getByRole('rowheader')
    await expect(page.getByText('Beispieldaten: Berufe und Skillwerte sind fiktiv.')).toBeVisible()

    // Standard: Stufe absteigend
    await expect(table.getByRole('columnheader', { name: 'Stufe' })).toHaveAttribute('aria-sort', 'descending')

    const nameHeader = table.getByRole('columnheader', { name: 'Charakter' })
    await nameHeader.getByRole('button').click()
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    await expect(page).toHaveURL(/sortierung=name&richtung=aufsteigend/)
    await expect(firstName()).toHaveText(/^Eisblume Frostweber/)
    await nameHeader.getByRole('button').click()
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
    await expect(firstName()).toHaveText(/^Zischelbart Rußfunke/)

    // Skill absteigend: Charaktere ohne Berufe stehen ganz unten
    const skillHeader = table.getByRole('columnheader', { name: 'Skill' })
    await skillHeader.getByRole('button').click()
    await skillHeader.getByRole('button').click()
    await expect(skillHeader).toHaveAttribute('aria-sort', 'descending')
    await expect(table.locator('tbody tr').last()).toContainText('–')

    // Zwei Hauptberufe stehen in einer Zeile; Link zum Charakterprofil bleibt
    const row = table.getByRole('row').filter({ hasText: 'Eisblume Frostweber' })
    await expect(row).toContainText('Schneiderei')
    await expect(row).toContainText('Verzauberkunst')
    await row.getByRole('link', { name: 'Eisblume Frostweber' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Eisblume Frostweber' })).toBeVisible()
    await expect(page.getByText('Erste Hilfe')).toBeVisible()
  })

  test('Mitgliederprofil führt zum Charakter', async ({ page }) => {
    await page.goto('/mitglieder/demo-member-02')
    await expect(page.getByRole('heading', { level: 1, name: 'Brummbart' })).toBeVisible()
    await page.getByRole('link', { name: 'Hammerherz' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hammerherz' })).toBeVisible()
    await expect(page.getByText('Stufe 22 Zwerg Paladin')).toBeVisible()
  })

  test('unbekannte Mitglieder zeigen einen verständlichen Hinweis', async ({ page }) => {
    await page.goto('/mitglieder/gibt-es-nicht')
    await expect(page.getByText('Dieses Mitglied gibt es nicht (mehr)')).toBeVisible()
  })
})

test.describe('Startseite', () => {
  test('zeigt Termine, Statistik und Clips', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Nächste Termine' })).toBeVisible()
    await expect(page.getByText('Charaktere nach Klasse')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Beliebte Clips' })).toBeVisible()
    // Discord-Duplikat des angekündigten Runs erscheint nicht doppelt
    await expect(page.getByRole('heading', { name: 'Halle der Thane – Gilden-Run' })).toHaveCount(0)
  })

  test('Livestatus ist ehrlich und lässt sich in der Demo simulieren', async ({ page }) => {
    await page.goto('/')
    const indicator = page.locator('.hero').getByRole('link', { name: /Miinyu/ })
    await expect(indicator).toContainText('Miinyu auf Twitch')
    await page.getByLabel('Live simulieren').check()
    // Ohne Neuladen: alle Daten werden nach dem Umschalten aktualisiert
    await expect(indicator).toContainText('Miinyu ist live')
    // …und der Zustand bleibt nach einem Reload erhalten (Cookie)
    await page.reload()
    await expect(page.locator('.hero').getByRole('link', { name: /Miinyu/ })).toContainText('Miinyu ist live')
  })
})

test.describe('Clips & Regeln', () => {
  test('Clip-Zeitraum filtert', async ({ page }) => {
    await page.goto('/clips')
    const clips = page.getByRole('article')
    const all = await clips.count()
    await page.getByRole('button', { name: '7 Tage' }).click()
    await expect(page).toHaveURL(/zeitraum=7d/)
    await expect.poll(() => clips.count()).toBeLessThan(all)
  })

  test('Regeln sind als Beispiel gekennzeichnet', async ({ page }) => {
    await page.goto('/regeln')
    await expect(page.getByRole('note')).toContainText('Beispielregeln')
    await expect(page.getByRole('heading', { level: 2, name: 'Miteinander' })).toBeVisible()
  })
})

test.describe('Chronik & Rangliste', () => {
  test('Gilden-Chronik zeigt markierte Beispiel-Meilensteine, neueste zuerst', async ({ page }) => {
    await page.goto('/gilde')
    const chronicle = page.locator('#chronik')
    await expect(chronicle.getByRole('heading', { name: 'Unsere Geschichte' })).toBeVisible()
    await expect(chronicle.getByText(/Beispieldaten/)).toBeVisible()
    const titles = chronicle.getByRole('listitem').getByRole('heading')
    await expect(titles.first()).toHaveText('Erster gemeinsamer Raid')
    await expect(titles.last()).toHaveText('Die Gilde wurde gegründet')
    await expect(chronicle.getByText(/erkannt am/i)).toBeVisible()
  })

  test('Rangliste wechselt zwischen Main und Gesamt', async ({ page }) => {
    await page.goto('/rangliste')
    const main = page.getByRole('button', { name: 'Main-Charakter' })
    const total = page.getByRole('button', { name: 'Gesamt' })
    await expect(main).toHaveAttribute('aria-pressed', 'true')
    await total.click()
    await expect(total).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Main und alle Twinks einer Person zusammen.')).toBeVisible()
  })

  test('Eintrag aufklappen zeigt, wie die Punkte zustande kommen', async ({ page }) => {
    await gotoReady(page, '/rangliste')
    const first = page.getByRole('list').getByRole('listitem').filter({ hasText: 'Punkte' }).first()
    const toggle = first.getByRole('button').first()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(first.getByRole('heading', { name: 'So kommen die Punkte zustande' })).toBeVisible()
    await expect(first.getByText(/Stufe 2 bis \d+/)).toBeVisible()
    await toggle.click()
    await expect(first.getByRole('heading', { name: 'So kommen die Punkte zustande' })).toBeHidden()
  })
})

test.describe('Schwarzes Brett', () => {
  test('nur Mitglieder sehen die Aushänge, Besucher nicht', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: PERSONA_COOKIE, value: 'visitor', url: baseURL! }])
    await gotoReady(page, '/')
    await expect(page.getByRole('heading', { name: 'Schwarzes Brett' })).toHaveCount(0)
    expect((await page.request.get('/api/board')).status()).toBe(401)

    await page.getByLabel('Ansicht als').selectOption('member')
    const board = page.getByRole('region', { name: 'Schwarzes Brett' })
    await expect(board.getByRole('heading', { name: /Feuerflossenschnapper/ })).toBeVisible()
    await expect(board.getByText('Beispieldaten: Die Aushänge sind fiktiv.')).toBeVisible()
    await expect(board.getByRole('button', { name: 'Aushang hinzufügen' })).toHaveCount(0)
  })

  test('Admins hängen aus, bearbeiten und entfernen – leeres Brett verschwindet für Mitglieder', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: PERSONA_COOKIE, value: 'admin', url: baseURL! }])
    await gotoReady(page, '/')
    const board = page.getByRole('region', { name: 'Schwarzes Brett' })

    await board.getByRole('button', { name: 'Aushang hinzufügen' }).click()
    const dialog = page.getByRole('dialog', { name: 'Neuer Aushang' })
    await dialog.getByLabel('Titel').fill('Heiler für BRD heute Abend')
    await dialog.getByRole('button', { name: 'Aushängen' }).click()
    await expect(board.getByRole('heading', { name: 'Heiler für BRD heute Abend' })).toBeVisible()

    await board.getByRole('button', { name: /Bearbeiten\s*: Heiler für BRD heute Abend/ }).click()
    const edit = page.getByRole('dialog', { name: 'Aushang bearbeiten' })
    await edit.getByLabel('Titel').fill('Heiler und Tank für BRD')
    await edit.getByRole('button', { name: 'Änderungen speichern' }).click()
    await expect(board.getByRole('heading', { name: 'Heiler und Tank für BRD' })).toBeVisible()

    // alle entfernen (zweiter Klick bestätigt)
    for (const title of ['Heiler und Tank', 'Feuerflossenschnapper', 'Verzauberer für Waffen']) {
      await board.getByRole('button', { name: new RegExp(`^Entfernen\\s*: .*${title}`) }).click()
      await board.getByRole('button', { name: /Wirklich entfernen\?/ }).click()
    }
    await expect(board.getByText(/Gerade hängt nichts aus/)).toBeVisible()

    await page.getByLabel('Ansicht als').selectOption('member')
    await expect(page.getByRole('heading', { name: 'Schwarzes Brett' })).toHaveCount(0)
  })
})
