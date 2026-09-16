import { defineConfig } from '@playwright/test'

const local = process.env.PHM_LOCAL === '1'
const port = local ? 4174 : 4173
const baseURL = `http://localhost:${port}`
const frontend = {
  command: `npm run preview -- --host localhost --port ${port} --strictPort${local ? ' --outDir dist-local' : ''}`,
  url: baseURL,
  reuseExistingServer: !process.env.CI,
}
export default defineConfig({
  testDir: './tests/browser',
  timeout: 180000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: { baseURL, channel: 'msedge', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: local ? [
    {
      command: '"../../.venv/Scripts/python.exe" -m uvicorn backend.api.main:app --app-dir .. --host 127.0.0.1 --port 8001',
      url: 'http://127.0.0.1:8001/openapi.json',
      reuseExistingServer: !process.env.CI,
    },
    frontend,
  ] : frontend,
})
