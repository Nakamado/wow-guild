import { expect, test, type BrowserContext } from '@playwright/test'

const PERSONA_COOKIE = 'wow-guild-demo-persona'

async function asPersona(context: BrowserContext, baseURL: string | undefined, persona: string) {
  await context.addCookies([{ name: PERSONA_COOKIE, value: persona, url: baseURL! }])
}

test.describe('Adminbereich – serverseitige Berechtigungen', () => {
  test('Besucher und Mitglieder kommen nicht an Admin-Schnittstellen', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'visitor')
    expect((await page.request.get('/api/admin/members')).status()).toBe(401)
    await asPersona(context, baseURL, 'member')
    for (const path of ['/api/admin/overview', '/api/admin/members', '/api/admin/activity', '/api/admin/grants']) {
      expect((await page.request.get(path)).status(), path).toBe(403)
    }
    const role = await page.request.patch('/api/admin/members/100000000000000003/role', { data: { role: 'admin' } })
    expect(role.status()).toBe(403)
  })

  test('Admins sehen die Übersicht, aber weder Protokoll noch Nachweise und vergeben keine Rollen', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'admin')
    // erlaubt – im Demo-Modus aber ohne Datenbank (409 statt 403)
    expect((await page.request.get('/api/admin/members')).status()).toBe(409)
    expect((await page.request.get('/api/admin/activity')).status()).toBe(403)
    expect((await page.request.get('/api/admin/grants')).status()).toBe(403)
    expect((await page.request.get('/api/admin/grants/3f1c2a7e-5b4d-4c8e-9a1f-2b3c4d5e6f70/evidence')).status()).toBe(403)
    expect((await page.request.patch('/api/admin/members/100000000000000003/role', { data: { role: 'admin' } })).status()).toBe(403)
  })

  test('der Hauptadmin darf alles – im Demo-Modus nur ohne Datenbank', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'superadmin')
    for (const path of ['/api/admin/activity', '/api/admin/grants']) {
      expect((await page.request.get(path)).status()).toBe(409)
    }
  })

  test('Bereinigung läuft nur mit Cron-Secret', async ({ page }) => {
    expect((await page.request.get('/api/cron/cleanup')).status()).toBe(401)
    expect((await page.request.get('/api/cron/cleanup', { headers: { Authorization: 'Bearer falsch' } })).status()).toBe(401)
  })
})

test.describe('Adminbereich – Oberfläche', () => {
  test('Mitglieder sehen keinen Zugang, Admins einen Hinweis zur Demo', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'member')
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Kein Zugriff' })).toBeVisible()

    await asPersona(context, baseURL, 'admin')
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Nur auf der echten Seite' })).toBeVisible()
  })
})

test.describe('Konto löschen', () => {
  test('ist in den Einstellungen erreichbar, in der Demo aber gesperrt', async ({ page, context, baseURL }) => {
    await asPersona(context, baseURL, 'member')
    await page.goto('/einstellungen')
    await expect(page.getByRole('heading', { name: 'Konto löschen' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Konto löschen' })).toBeDisabled()
    expect((await page.request.delete('/api/me/account', { data: { confirm: true } })).status()).toBe(409)
  })
})

test('Datenschutzerklärung erklärt Änderungsprotokoll und Ranglistenfreigaben', async ({ page }) => {
  await page.goto('/datenschutz')
  await expect(page.getByRole('heading', { name: '10. Änderungsprotokoll' })).toBeVisible()
  await expect(page.getByText(/nach 90 Tagen automatisch/)).toBeVisible()
  await expect(page.getByText(/ausschließlich der Betreiber, nicht andere Admins/)).toBeVisible()
})
