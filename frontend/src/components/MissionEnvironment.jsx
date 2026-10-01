import { useEffect, useState } from 'react'

const PLACEHOLDER = {
  temperature: 'Loading...',
  windSpeed: 'Loading...',
  humidity: 'Loading...',
  visibility: 'Loading...',
  missionRisk: 'Waiting for API',
  status: 'API Not Connected',
}

const ERROR_STATE = {
  temperature: 'Weather data unavailable',
  windSpeed: 'Weather data unavailable',
  humidity: 'Weather data unavailable',
  visibility: 'Weather data unavailable',
  missionRisk: 'Service unavailable',
  status: 'API Error',
}

const UNAVAILABLE_STATE = {
  temperature: 'Weather service temporarily unavailable',
  windSpeed: 'Weather service temporarily unavailable',
  humidity: 'Weather service temporarily unavailable',
  visibility: 'Weather service temporarily unavailable',
  missionRisk: 'Service unavailable',
  status: 'Service Unavailable',
}

const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather'

function calculateMissionRisk(data) {
  const temp = Number(data.main.temp)
  const windSpeed = Number(data.wind?.speed ?? 0)
  const humidity = Number(data.main.humidity)
  const visibility = data.visibility ? Number(data.visibility) / 1000 : 10

  let riskFactors = []
  let riskLevel = 'LOW'

  if (temp > 35) {
    riskFactors.push('High temperature')
    riskLevel = 'HIGH'
  } else if (temp > 30) {
    riskFactors.push('Elevated temperature')
    riskLevel = 'MEDIUM'
  }

  if (windSpeed > 15) {
    riskFactors.push('High wind speed')
    riskLevel = 'HIGH'
  } else if (windSpeed > 10) {
    riskFactors.push('Moderate wind speed')
    if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM'
  }

  if (humidity > 90) {
    riskFactors.push('High humidity')
    if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM'
  }

  if (visibility < 2) {
    riskFactors.push('Low visibility')
    riskLevel = 'HIGH'
  } else if (visibility < 5) {
    riskFactors.push('Reduced visibility')
    if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM'
  }

  if (riskFactors.length === 0) {
    return { level: 'LOW', factors: 'Conditions favorable' }
  }

  return { level: riskLevel, factors: riskFactors.join(', ') }
}

function formatWeather(data) {
  const visibilityKm = data.visibility == null ? '--' : `${(Number(data.visibility) / 1000).toFixed(1)} km`
  const risk = calculateMissionRisk(data)

  return {
    temperature: `${Number(data.main.temp).toFixed(1)}°C`,
    windSpeed: `${Number(data.wind?.speed ?? 0).toFixed(1)} m/s`,
    humidity: `${Number(data.main.humidity)}%`,
    visibility: visibilityKm,
    missionRisk: `${risk.level} - ${risk.factors}`,
    status: 'API Connected',
  }
}

export async function loadMissionEnvironment(apiKey) {
  console.log('[Weather API] Starting weather data fetch')

  if (!apiKey) {
    console.error('[Weather API] Missing API key - VITE_OPENWEATHER_API_KEY is not defined')
    throw new Error('Missing OpenWeather API key - check VITE_OPENWEATHER_API_KEY environment variable')
  }

  console.log('[Weather API] API key present (length:', apiKey.length, ')')

  const params = new URLSearchParams({
    q: 'Bengaluru',
    appid: apiKey,
    units: 'metric',
  })

  const url = `${OPENWEATHER_URL}?${params.toString()}`
  console.log('[Weather API] Fetching from:', url.replace(apiKey, '***REDACTED***'))

  let response
  try {
    response = await fetch(url)
    console.log('[Weather API] Response status:', response.status, response.statusText)
  } catch (fetchError) {
    console.error('[Weather API] Network error during fetch:', fetchError.message)
    throw new Error(`Network error: ${fetchError.message}`)
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Weather API] API request failed:', response.status, errorText)
    throw new Error(`OpenWeather API returned ${response.status}: ${response.statusText}`)
  }

  let payload
  try {
    payload = await response.json()
    console.log('[Weather API] Response received successfully')
  } catch (parseError) {
    console.error('[Weather API] Failed to parse JSON response:', parseError)
    throw new Error('Failed to parse API response')
  }

  if (payload?.main == null) {
    console.error('[Weather API] Invalid payload structure:', payload)
    throw new Error('OpenWeather payload incomplete - missing main data')
  }

  console.log('[Weather API] Weather data formatted successfully')
  return formatWeather(payload)
}

export default function MissionEnvironment() {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
  const [environment, setEnvironment] = useState(PLACEHOLDER)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    let cancelled = false

    console.log('[Weather Component] Environment variable check:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      envVarPresent: 'VITE_OPENWEATHER_API_KEY' in import.meta.env
    })

    loadMissionEnvironment(apiKey)
      .then((data) => {
        if (!cancelled) {
          setEnvironment(data)
          setErrorMessage(null)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[Weather Component] Error loading weather data:', error.message)
          setErrorMessage(error.message)
          setEnvironment(UNAVAILABLE_STATE)
        }
      })

    return () => {
      cancelled = true
    }
  }, [apiKey])

  return (
    <section className="panel" aria-label="Mission environment" style={{ padding: '18px 21px', marginTop: '14px' }}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">MISSION ENVIRONMENT</span>
        </div>
        <div className="mission-state" role="status"><i /> {environment.status.toUpperCase()}</div>
      </div>
      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '14px',
            borderRadius: '6px',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            fontSize: '11px',
            color: '#ff6b6b',
            lineHeight: '1.4',
          }}
        >
          <strong>Error:</strong> {errorMessage}
        </div>
      )}
      <div className="metric-grid">
        <article className="metric-card">
          <span>TEMPERATURE</span>
          <strong>{environment.temperature}</strong>
        </article>
        <article className="metric-card">
          <span>WIND SPEED</span>
          <strong>{environment.windSpeed}</strong>
        </article>
        <article className="metric-card">
          <span>HUMIDITY</span>
          <strong>{environment.humidity}</strong>
        </article>
        <article className="metric-card">
          <span>VISIBILITY</span>
          <strong>{environment.visibility}</strong>
        </article>
      </div>
      <div className="readiness">
        <span>Mission Risk <b>{environment.missionRisk}</b></span>
        <span>Status <b>{environment.status}</b></span>
      </div>
    </section>
  )
}
