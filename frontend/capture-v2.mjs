import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 1050 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if(message.type() === 'error') errors.push(message.text()) })
await page.goto('http://127.0.0.1:5173/')
await page.getByText('Telemetry connected', { exact: true }).waitFor({ timeout: 20000 })
await page.screenshot({ path: '../artifacts/vayu-desktop.png', fullPage: true })
console.log(JSON.stringify({ title: await page.title(), errors, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) }))
await page.setViewportSize({width:390,height:844})
await page.screenshot({ path: '../artifacts/vayu-mobile.png', fullPage: true })
console.log(JSON.stringify({mobileOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)}))
await browser.close()
