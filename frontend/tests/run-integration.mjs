import { spawnSync } from 'node:child_process'

// Build a separate artifact for the real local backend. Production dist/ keeps Render.
const env = { ...process.env, VITE_API_BASE_URL: 'http://127.0.0.1:8001', PHM_LOCAL: '1' }
for (const args of [
  ['node_modules/vite/bin/vite.js', 'build', '--outDir', 'dist-local'],
  ['node_modules/@playwright/test/cli.js', 'test', 'tests/browser/live.spec.js'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
