import { test, expect } from '@playwright/test'

const base = 'https://sih26054-phm.onrender.com'
import { sample, samples, analysis, validation, history, experiment, makeReplay } from '../fixtures/contracts.js'
async function mockApi(page, overrides = {}) {
  const requests = []
  await page.route(base + '/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    requests.push({ path, body: route.request().postDataJSON() })
    const responses = {
      '/api/demo-flight': { telemetry: samples }, '/api/analyze': analysis,
      '/api/health-history': history, '/api/validation': validation,
      '/api/replay': makeReplay(),
      '/api/experiment': experiment,
      '/reset': { status: 'EKF estimator reset' },
    }
    if (overrides[path]) return overrides[path](route)
    await route.fulfill({ json: responses[path] })
  })
  return requests
}
function collectErrors(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  return errors
}

test('all routes render with coherent scores, timestamped charts and no console errors', async ({ page }) => {
  const errors = collectErrors(page)
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByText('Latest telemetry decision')).toBeVisible()
  await expect(page.getByText('RISK SCORE', { exact: true })).toBeVisible()
  await expect(page.locator('.gauge-center strong')).toHaveText('10.7%')
  for (const [name, heading] of [['Telemetry Analytics', 'Signal intelligence'], ['Engine Health', 'Expected vs actual state'], ['Fault Diagnosis', 'Fault assessment'], ['Replay Center', 'Flight playback'], ['Validation', 'Confidence in the classifier'], ['Experiment Lab', 'Scenario runner']]) {
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('CSV upload refreshes telemetry and analysis across routes and reset calls the correct endpoint', async ({ page }) => {
  const requests = await mockApi(page, {
    '/api/analyze': (route) => {
      const body = route.request().postDataJSON()
      return route.fulfill({ json: body.rpm === 4000 ? { ...analysis, health_score: 0, risk_score: 100, fault_type: 'ENGINE_DEGRADATION', decision: 'RETURN_TO_BASE', estimated: { rpm: 4000, egt: 600, cht: 190 } } : analysis })
    },
  })
  await page.goto('/')
  await expect(page.getByText('Latest telemetry decision')).toBeVisible()
  await page.getByLabel('Upload telemetry CSV').setInputFiles({ name: 'flight.csv', mimeType: 'text/csv', buffer: Buffer.from('timestamp,rpm,egt,cht,throttle\n2026-09-12T08:00:00Z,3900,590,180,72\n2026-09-12T08:01:00Z,4000,600,190,72') })
  await expect(page.locator('.kpi-card').filter({ has: page.getByText('RPM', { exact: true }) }).locator('.kpi-value')).toContainText('4,000')
  await expect(page.locator('.gauge-center strong')).toHaveText('0%')
  await expect(page.getByText('100.0%', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Fault Diagnosis', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'ENGINE_DEGRADATION' })).toBeVisible()
  await page.getByRole('link', { name: 'Mission Control', exact: true }).click()
  await page.getByRole('button', { name: 'RESET ESTIMATOR' }).click()
  await expect(page.locator('.gauge-center strong')).toHaveText('10.7%')
  expect(requests.filter((request) => request.path === '/reset')).toHaveLength(1)
  expect(requests.filter((request) => request.path === '/api/analyze')[1].body.timestamp).toBe('2026-09-12T08:01:00Z')
})

test('bad CSV is rejected without a network request', async ({ page }) => {
  const requests = await mockApi(page)
  await page.goto('/')
  await expect(page.getByText('Latest telemetry decision')).toBeVisible()
  await page.getByLabel('Upload telemetry CSV').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('rpm,egt,cht,throttle\n,600,190,72') })
  await expect(page.getByRole('alert')).toContainText('Invalid numeric value')
  expect(requests.filter((request) => request.path === '/api/analyze')).toHaveLength(1)
})

test('a startup failure leaves independent pages usable and retry restores the mission', async ({ page }) => {
  let failed = true
  await mockApi(page, { '/api/analyze': (route) => route.fulfill(failed ? { status: 503, json: { detail: 'Temporarily offline' } } : { json: analysis }) })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Temporarily offline')
  await page.getByRole('link', { name: 'Validation', exact: true }).click()
  await expect(page.getByText('96.8%', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Mission Control', exact: true }).click()
  failed = false
  await page.getByRole('button', { name: 'RETRY' }).click()
  await expect(page.getByText('Latest telemetry decision')).toBeVisible()
})

test('malformed responses and structured 422 errors render readable errors', async ({ page }) => {
  await mockApi(page, {
    '/api/validation': (route) => route.fulfill({ json: { ...validation, confusion_matrix: null } }),
    '/api/analyze': (route) => route.fulfill({ status: 422, json: { detail: [{ loc: ['body', 'rpm'], msg: 'Field required' }] } }),
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('body.rpm: Field required')
  await page.getByRole('link', { name: 'Validation', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('invalid validation metrics')
})

test('replay stops at the last frame and reset rewinds locally', async ({ page }) => {
  const requests = await mockApi(page)
  await page.goto('/replay')
  await expect(page.getByText('FRAME 01 / 2')).toBeVisible()
  await page.getByRole('button', { name: '4x', exact: true }).click()
  await page.getByRole('button', { name: 'PLAY', exact: true }).click()
  await expect(page.getByText('FRAME 02 / 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'RESET', exact: true }).click()
  await expect(page.getByText('FRAME 01 / 2')).toBeVisible()
  expect(requests.filter((request) => request.path === '/api/replay')).toHaveLength(1)
  expect(requests.find((request) => request.path === '/api/replay').body.telemetry[0].throttle).toBe(72)
})

test('stateful failures are not retried automatically and replay can recover manually', async ({ page }) => {
  let failed = true
  const requests = await mockApi(page, { '/api/replay': (route) => route.fulfill(failed ? { status: 500, body: 'Internal Server Error' } : { json: makeReplay() }) })
  await page.goto('/replay')
  await expect(page.getByRole('alert')).toContainText('HTTP 500')
  expect(requests.filter((request) => request.path === '/api/replay')).toHaveLength(1)
  failed = false
  await page.getByRole('button', { name: 'RETRY' }).click()
  await expect(page.getByText('FRAME 01 / 2')).toBeVisible()
})

test('experiment submission is disabled while pending', async ({ page }) => {
  let finish
  const requests = await mockApi(page, { '/api/experiment': async (route) => { await new Promise((resolve) => { finish = resolve }); await route.fulfill({ json: experiment }) } })
  await page.goto('/experiments')
  await page.getByRole('button', { name: 'RUN EXPERIMENT' }).click()
  await expect(page.getByRole('button', { name: 'RUNNING…' })).toBeDisabled()
  await expect.poll(() => typeof finish).toBe('function')
  finish()
  await expect(page.locator('pre')).toContainText('results')
  expect(requests.filter((request) => request.path === '/api/experiment')).toHaveLength(1)
})

test('mobile navigation and unknown routes stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByText('Latest telemetry decision')).toBeVisible()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Engine Health', exact: true }).click()
  await expect(page.getByText('Expected vs actual state')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.goto('/missing')
  await expect(page.getByRole('link', { name: 'Return to Mission Control' })).toBeVisible()
})


test('malformed quoted telemetry never reaches the backend', async ({ page }) => {
  const requests = await mockApi(page)
  await page.goto('/')
  await expect(page.getByText('Latest telemetry decision')).toBeVisible()
  for (const value of ['35"66"', '"35"66', '"35" "66"']) {
    await page.getByLabel('Upload telemetry CSV').setInputFiles({ name: 'corrupted.csv', mimeType: 'text/csv', buffer: Buffer.from('rpm,egt,cht,throttle\n' + value + ',560.6,163.8,72') })
    await expect(page.getByRole('alert')).toContainText('CSV line')
  }
  expect(requests.filter((request) => request.path === '/api/analyze')).toHaveLength(1)
})

for (const [severity, tone, color] of [['LOW', 'green', 'rgb(34, 197, 94)'], ['MEDIUM', 'yellow', 'rgb(250, 204, 21)'], ['HIGH', 'orange', 'rgb(251, 146, 60)'], ['CRITICAL', 'red', 'rgb(239, 68, 68)']]) {
  test(severity + ' is colored independently of HEALTHY on all mission pages', async ({ page }) => {
    await mockApi(page, { '/api/analyze': (route) => route.fulfill({ json: { ...analysis, severity, fault_type: 'HEALTHY' } }) })
    await page.goto('/')
    await expect(page.locator('.hero-status')).toHaveCSS('color', color)
    await expect(page.locator('.system-online .pulse-dot')).toHaveCSS('background-color', color)
    await expect(page.locator('.analysis-card .status-badge')).toHaveClass(new RegExp(tone))
    await page.getByRole('link', { name: 'Engine Health', exact: true }).click()
    await expect(page.locator('.page > .section-heading .status-badge')).toHaveClass(new RegExp(tone))
    await page.getByRole('link', { name: 'Fault Diagnosis', exact: true }).click()
    await expect(page.locator('.fault-hero .status-badge')).toHaveClass(new RegExp(tone))
    await expect(page.locator('.fault-hero')).toHaveCSS('color', color)
  })
}

test('gauge needle, scale and arc agree at 0, 50 and 100', async ({ page }) => {
  for (const health of [0, 50, 100]) {
    await page.unrouteAll()
    await mockApi(page, { '/api/analyze': (route) => route.fulfill({ json: { ...analysis, health_score: health, risk_score: 100 - health } }) })
    await page.goto('/')
    await expect(page.locator('.gauge-center strong')).toHaveText(health + '%')
    await expect(page.locator('.gauge-pointer')).toHaveAttribute('transform', 'rotate(' + health * 1.8 + ' 130 130)')
    expect(await page.locator('.health-gauge stop').evaluateAll((stops) => stops.map((stop) => stop.getAttribute('stop-color')))).toEqual(['#ef4444', '#facc15', '#22c55e'])
  }
})
