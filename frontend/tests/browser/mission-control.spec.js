import { expect, test } from '@playwright/test'
import { analysis, history, makeReplay, samples } from '../fixtures/contracts.js'

async function mockMissionApi(page) {
  await page.route('**/api/v2/fleet', (route) => route.fulfill({
    json: {
      summary: {
        asset_count: 2,
        fleet_health: 86,
        fleet_readiness_score: 91,
        mission_available: 2,
        high_risk_assets: 0,
      },
      assets: [
        {
          engine_id: 'VAYU-01',
          sector: 'LEAD',
          callsign: 'MALE-01',
          coordinates: { x: 50, y: 50 },
          health_index: 94,
          reliability_percent: 98,
          rul_hours: 286,
          risk_percent: 2,
          readiness: 'ACTIVE',
        },
        {
          engine_id: 'VAYU-02',
          sector: 'NORTH',
          callsign: 'MALE-02',
          coordinates: { x: 50, y: 22 },
          health_index: 82,
          reliability_percent: 84,
          rul_hours: 174,
          risk_percent: 16,
          readiness: 'READY',
        },
      ],
    },
  }))
  await page.route('**/api/demo-flight', (route) => route.fulfill({ json: { telemetry: samples } }))
  await page.route('**/api/analyze', (route) => route.fulfill({ json: analysis }))
  await page.route('**/api/replay', (route) => route.fulfill({ json: makeReplay() }))
  await page.route('**/api/health-history', (route) => route.fulfill({ json: history }))
}

test('mission operations pages render and link through the current command layout', async ({ page }) => {
  await mockMissionApi(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Mission overview' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Health score \d+ out of 100/ })).toBeVisible()
  await expect(page.getByLabel(/Estimated remaining useful life: \d+(\.\d+)? hours/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CONTINUE MISSION' })).toBeVisible()
  await expect(page.locator('.live-readout')).toHaveCount(6)

  await page.getByRole('link', { name: 'Telemetry', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Live Telemetry' })).toBeVisible()
  await expect(page.locator('.telemetry-grid .chart-card')).toHaveCount(6)
  const initialRpm = await page.locator('.telemetry-grid .chart-card header b').first().textContent()
  await expect.poll(
    () => page.locator('.telemetry-grid .chart-card header b').first().textContent(),
  ).not.toBe(initialRpm)

  await page.getByRole('link', { name: 'Fleet', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Fleet command center' })).toBeVisible()
  await expect(page.locator('.fleet-asset-table button')).toHaveCount(3)
  await expect(page.getByText(/last update/)).toBeVisible()
  const maintenanceAsset = page.locator('.fleet-asset-table button').filter({ hasText: 'VAYU-03' })
  await expect(maintenanceAsset).toContainText('67')
  await expect(maintenanceAsset).toContainText('MAINTENANCE REQUIRED')
  await page.getByRole('button', { name: /Select VAYU-02/ }).click()
  await expect(page.locator('.fleet-asset h3')).toContainText('VAYU-02')
  await expect(page.getByText('174 h RUL')).toBeVisible()

  await page.getByRole('link', { name: 'Digital Twin', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Digital twin', exact: true })).toBeVisible()
  await expect(page.locator('.twin-grid')).toBeVisible()
  await expect(page.locator('.twin-grid .twin-card')).toHaveCount(6)
  await expect(page.getByText('RESIDUAL ANALYSIS').first()).toBeVisible()

  await page.getByRole('link', { name: 'Replay', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Flight playback' })).toBeVisible()
  await expect(page.getByText(/FRAME 01 \/ \d+/)).toBeVisible()
  await expect(page.locator('.replay-chart-grid .chart-wrap')).toHaveCount(4)

  await page.getByRole('link', { name: 'Diagnosis', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Fault assessment' })).toBeVisible()
  await expect(page.getByText('RECOMMENDED ACTION')).toBeVisible()

  await page.getByRole('link', { name: 'Analytics', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Engine trends' })).toBeVisible()
  await expect(page.locator('.fault-frequency-card')).toBeVisible()
})

test('mission navigation and fleet panels remain usable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockMissionApi(page)
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Fleet', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Fleet command center' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  for (const [name, heading] of [
    ['Telemetry', 'Live Telemetry'],
    ['Digital Twin', 'Digital twin'],
    ['Replay', 'Flight playback'],
    ['Diagnosis', 'Fault assessment'],
    ['Analytics', 'Engine trends'],
  ]) {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(documentWidth, `${name} has horizontal overflow at mobile width`).toBeLessThanOrEqual(390)
  }
})

test('live fault injection updates health, mission decision, and diagnosis', async ({ page }) => {
  await mockMissionApi(page)
  await page.goto('/')
  const healthValue = page.locator('.metric-card').filter({ hasText: 'HEALTH SCORE' }).locator('strong')
  const nominalHealth = await healthValue.textContent()

  await page.getByRole('button', { name: 'Inject engine degradation' }).click()
  await expect.poll(() => healthValue.textContent()).not.toBe(nominalHealth)
  await expect(page.getByRole('heading', { name: 'RETURN TO BASE' })).toBeVisible()

  await page.getByRole('link', { name: 'Diagnosis', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'ENGINE DEGRADATION' })).toBeVisible()
  await expect(page.getByText(/RECOMMENDED ACTION · RETURN TO BASE/)).toBeVisible()
})
