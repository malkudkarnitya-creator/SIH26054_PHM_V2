import { test, expect } from '@playwright/test'

test('real API: upload through replay and reset must all succeed', async ({ page }, testInfo) => {
  test.skip(process.env.PHM_LIVE !== '1' && process.env.PHM_LOCAL !== '1', 'Run test:integration or enable PHM_LIVE.')
  const base = process.env.PHM_LOCAL === '1' ? 'http://127.0.0.1:8001' : 'https://sih26054-phm.onrender.com'
  const errors = [], statuses = [], requests = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  page.on('request', (request) => { if (request.url().startsWith(base)) requests.push({ url: request.url(), method: request.method(), payload: request.postDataJSON() }) })
  page.on('response', (response) => { if (response.url().startsWith(base)) statuses.push({ url: response.url(), status: response.status() }) })
  try {
    await page.goto('/')
    await expect(page.getByText('Latest telemetry decision')).toBeVisible({ timeout: 110000 })
    await expect(page.locator('.gauge-center strong')).toHaveText(/\d+(\.\d+)?%/)
    await expect(page.getByText('RISK SCORE', { exact: true })).toBeVisible()
    await expect(page.locator('.hero-status')).toHaveClass(/severity-orange/)
    const csv = 'timestamp,rpm,egt,cht,throttle,altitude\n2026-09-12T08:00:00Z,4576,588,175.2,72,1200\n2026-09-12T08:01:00Z,4576,588,175.2,72,1200'
    await page.getByLabel('Upload telemetry CSV').setInputFiles({ name: 'live.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
    await expect(page.locator('.gauge-center strong')).toHaveText('100%', { timeout: 110000 })
    await expect(page.locator('.hero-status')).toHaveClass(/severity-green/)
    await page.getByRole('link', { name: 'Engine Health', exact: true }).click()
    await expect(page.getByText('Expected vs actual state')).toBeVisible()
    await expect(page.locator('.comparison-row').first()).toContainText('4576.0')
    await expect(page.locator('.health-gauge stop').first()).toHaveAttribute('stop-color', '#ef4444')
    await expect(page.locator('.health-gauge stop').last()).toHaveAttribute('stop-color', '#22c55e')
    await expect(page.locator('.gauge-pointer')).toHaveAttribute('transform', 'rotate(180 130 130)')
    await page.getByRole('link', { name: 'Fault Diagnosis', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'HEALTHY' })).toBeVisible()
    await page.getByRole('link', { name: 'Telemetry Analytics', exact: true }).click()
    await expect(page.getByText('Signal intelligence')).toBeVisible({ timeout: 110000 })
    await expect(page.locator('.recharts-line-curve')).toHaveCount(4)
    await page.getByRole('link', { name: 'Validation', exact: true }).click()
    await expect(page.getByText('96.8%', { exact: true })).toBeVisible({ timeout: 110000 })
    await expect(page.locator('td')).toHaveCount(16)
    await page.getByRole('link', { name: 'Experiment Lab', exact: true }).click()
    await page.getByRole('button', { name: 'RUN EXPERIMENT' }).click()
    await expect(page.locator('pre')).toContainText('predicted_fault', { timeout: 110000 })

    // Strict operational gate: a replay alert, 500, CORS failure or absent timeline fails.
    const replayResponse = Promise.race([
      page.waitForResponse((response) => response.url() === base + '/api/replay', { timeout: 95000 }),
      page.waitForEvent('requestfailed', { predicate: (request) => request.url() === base + '/api/replay', timeout: 95000 }).then((request) => { throw new Error('Replay network/CORS failure: ' + request.failure()?.errorText) }),
    ])
    await page.getByRole('link', { name: 'Replay Center', exact: true }).click()
    const response = await replayResponse
    expect(response.status(), 'Replay must return HTTP 200').toBe(200)
    const timeline = (await response.json()).timeline
    expect(timeline).toHaveLength(2)
    expect(timeline[0].timestamp).toBe('2026-09-12T08:00:00Z')
    expect(timeline[1].timestamp).toBe('2026-09-12T08:01:00Z')
    await expect(page.getByText('FRAME 01 / 2')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.getByRole('button', { name: '0.25x', exact: true }).click()
    await page.getByRole('button', { name: 'PLAY', exact: true }).click()
    await page.getByRole('button', { name: 'PAUSE', exact: true }).click()
    await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible()
    await page.getByLabel('Replay frame').fill('1')
    await expect(page.getByText('FRAME 02 / 2')).toBeVisible()
    await page.getByRole('button', { name: 'RESET', exact: true }).click()
    await expect(page.getByText('FRAME 01 / 2')).toBeVisible()
    await page.getByRole('button', { name: '4x', exact: true }).click()
    await page.getByRole('button', { name: 'PLAY', exact: true }).click()
    await expect(page.getByText('FRAME 02 / 2')).toBeVisible()
    await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('replay-working.png'), fullPage: true })

    await page.getByRole('link', { name: 'Mission Control', exact: true }).click()
    await page.getByRole('button', { name: 'RESET ESTIMATOR' }).click()
    await expect(page.locator('.gauge-center strong')).toHaveText('10.7%', { timeout: 110000 })
    await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true })
    expect(statuses.some((item) => item.url === base + '/reset' && item.status === 200)).toBe(true)
    expect(statuses.every((item) => item.status === 200)).toBe(true)
    expect(errors).toEqual([])
  } finally {
    await testInfo.attach('api-results', { body: JSON.stringify({ base, requests, statuses, errors }, null, 2), contentType: 'application/json' })
  }
})
