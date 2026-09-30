const PLACEHOLDER = {
  temperature: '--',
  windSpeed: '--',
  humidity: '--',
  visibility: '--',
  missionRisk: 'Waiting for API',
  status: 'API Not Connected',
}

export async function loadMissionEnvironment(apiKey) {
  // Future OpenWeather fetch belongs here. Do not call this until API integration is enabled.
  void apiKey
}

export default function MissionEnvironment() {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
  const environment = PLACEHOLDER
  void apiKey

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
          <p>Temperature: {environment.temperature}</p>
        </article>
        <article className="metric-card">
          <span>WIND SPEED</span>
          <strong>{environment.windSpeed}</strong>
          <p>Wind Speed: {environment.windSpeed}</p>
        </article>
        <article className="metric-card">
          <span>HUMIDITY</span>
          <strong>{environment.humidity}</strong>
          <p>Humidity: {environment.humidity}</p>
        </article>
        <article className="metric-card">
          <span>VISIBILITY</span>
          <strong>{environment.visibility}</strong>
          <p>Visibility: {environment.visibility}</p>
        </article>
      </div>
      <div className="readiness">
        <span>Mission Risk <b>{environment.missionRisk}</b></span>
        <span>Status <b>{environment.status}</b></span>
      </div>
    </section>
  )
}
