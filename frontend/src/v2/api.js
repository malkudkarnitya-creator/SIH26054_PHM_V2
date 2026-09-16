const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export async function request(path, body, signal) {
  const response = await fetch(`${BASE}/api/v2${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal || AbortSignal.timeout(12000),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status}). Check your inputs and API connection.`)
  }
  return response.json()
}
export function streamURL() {
  const url = new URL(`${BASE}/api/v2/stream`, window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
