import axios from 'axios'
import {
  normalizeTelemetry, validateDemo, validateAnalysis, replayPayload, validateReplay,
  validateHistory, validateValidation, experimentPayload, validateExperiment, validateReset,
} from './contracts.js'
export { validateAnalysis } from './contracts.js'

// Netlify has no FastAPI reverse proxy. Use Render unless a build-time override is supplied.
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'https://sih26054-phm-v2.onrender.com').replace(/\/$/, '')
const client = axios.create({ baseURL: API_BASE_URL, timeout: 90000 })
const pending = new Map()

function errorMessage(error) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => `${item.loc?.join('.') || 'Request'}: ${item.msg}`).join('; ')
  if (error.code === 'ECONNABORTED') return 'The PHM API took too long to respond. Please retry.'
  return `The PHM API is unavailable${error.response ? ` (HTTP ${error.response.status})` : ''}. Please retry.`
}

async function request(config) {
  try { return (await client.request(config)).data }
  catch (error) { throw new Error(errorMessage(error)) }
}

function once(key, load) {
  if (!pending.has(key)) pending.set(key, Promise.resolve().then(load).finally(() => pending.delete(key)))
  return pending.get(key)
}

export const getDemoFlight = () => once('demo', async () => validateDemo(await request({ method: 'get', url: '/api/demo-flight' })))
export const analyzeTelemetry = async (telemetry) => validateAnalysis(await request({ method: 'post', url: '/api/analyze', data: normalizeTelemetry(telemetry) }))
export const loadMission = () => once('mission', async () => {
  const { telemetry } = await getDemoFlight()
  const latest = telemetry[telemetry.length - 1]
  const analysis = await analyzeTelemetry({ ...latest, reset_filter: true })
  return { telemetry, latest, analysis, source: 'DEMO FLIGHT', updatedAt: new Date().toISOString() }
})
export const runReplay = (telemetry) => {
  const data = replayPayload(telemetry)
  return once(`replay:${JSON.stringify(data)}`, async () => validateReplay(await request({ method: 'post', url: '/api/replay', data })))
}
export const resetEstimator = async () => validateReset(await request({ method: 'post', url: '/reset' }))
export const runExperiment = async (fault, magnitude) => validateExperiment(await request({ method: 'post', url: '/api/experiment', data: experimentPayload(fault, magnitude) }))
export const getValidationMetrics = () => once('validation', async () => validateValidation(await request({ method: 'get', url: '/api/validation' })))
export const getHealthHistory = () => once('history', async () => validateHistory(await request({ method: 'get', url: '/api/health-history' })))

