import type { BrowserContext, Page } from '@playwright/test'

export const PERSONA_COOKIE = 'wow-guild-demo-persona'

export async function asPersona(context: BrowserContext, baseURL: string | undefined, persona: string) {
  await context.addCookies([{ name: PERSONA_COOKIE, value: persona, url: baseURL! }])
}

/** Seite öffnen und warten, bis Vue hydriert ist (Eingaben gehen sonst auf langsamen Geräten verloren). */
export async function gotoReady(page: Page, path: string) {
  const response = await page.goto(path)
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
  return response
}
