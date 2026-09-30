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
  missionRisk: 'Waiting for API',
  status: 'API Error',
}

const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather'

function formatWeather(data) {
  const visibilityKm = data.visibility == null ? '--' : `${(Number(data.visibility) / 1000).toFixed(1)} km`

  return {
    temperature: `${Number(data.main.temp).toFixed(1)}°C`,
    windSpeed: `${Number(data.wind?.speed ?? 0).toFixed(1)} m/s`,
    humidity: `${Number(data.main.humidity)}%`,
    visibility: visibilityKm,
    missionRisk: PLACEHOLDER.missionRisk,
    status: 'API Connected',
  }
}

export async function loadMissionEnvironment(apiKey) {
  if (!apiKey) {
    throw new Error('Missing OpenWeather API key')
  }

  const params = new URLSearchParams({
    q: 'Bengaluru',
    appid: apiKey,
    units: 'metric',
  })
  const response = await fetch(`${OPENWEATHER_URL}?${params.toString()}`)
  if (!response.ok) {
    throw new Error('OpenWeather request failed')
  }

  const payload = await response.json()
  if (payload?.main == null) {
    throw new Error('OpenWeather payload incomplete')
  }

  return formatWeather(payload)
}

export default function MissionEnvironment() {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
  const [environment, setEnvironment] = useState(PLACEHOLDER)

  useEffect(() => {
    let cancelled = false

    loadMissionEnvironment(apiKey)
      .then((data) => {
        if (!cancelled) setEnvironment(data)
      })
      .catch(() => {
        if (!cancelled) {
          setEnvironment(ERROR_STATE)
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
