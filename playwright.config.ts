import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 3000)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Testet den Produktions-Build; ein laufender Server (z. B. `pnpm dev`) wird lokal wiederverwendet.
  webServer: {
    command: `pnpm build && PORT=${port} node .output/server/index.mjs`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
