import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react'

const recommendations = {
  'CONTINUE MISSION': {
    action: 'Proceed within the simulated operating envelope and continue routine monitoring.',
    className: 'safe',
    Icon: CheckCircle2,
  },
  'REDUCE POWER': {
    action: 'Reduce engine load and monitor cylinder-head and exhaust temperatures.',
    className: 'warning',
    Icon: AlertTriangle,
  },
  'RETURN TO BASE': {
    action: 'End the demonstration sortie and arrange an engine inspection before the next run.',
    className: 'danger',
    Icon: ShieldAlert,
  },
}

export function HealthScore({ value, compact = false }) {
  const score = Math.max(0, Math.min(100, Number(value) || 0))
  const tone = score >= 80 ? 'healthy' : score >= 60 ? 'watch' : 'critical'
  const circumference = 2 * Math.PI * 44
  const description = score >= 80 ? 'Healthy' : score >= 60 ? 'Monitor' : 'Action required'

  return (
    <div
      className={`health-visual ${tone} ${compact ? 'compact' : ''}`}
      role="img"
      aria-label={`Health score ${score} out of 100. ${description}.`}
    >
      <svg viewBox="0 0 112 112" aria-hidden="true">
        <circle className="health-track" cx="56" cy="56" r="44" />
        <circle
          className="health-progress"
          cx="56"
          cy="56"
          r="44"
          strokeDasharray={`${score / 100 * circumference} ${circumference}`}
        />
      </svg>
      <strong>{Math.round(score)}<small>/100</small></strong>
      <span>HEALTH SCORE</span>
    </div>
  )
}

export function RemainingLife({ hours, lower, upper, maximum = 400 }) {
  const value = Math.max(0, Number(hours) || 0)
  const max = Math.max(maximum, value, Number(upper) || 0)
  const low = Math.max(0, Math.min(max, Number(lower) || value))
  const high = Math.max(low, Math.min(max, Number(upper) || value))
  const left = (low / max) * 100
  const width = ((high - low) / max) * 100
  const marker = (Math.min(value, max) / max) * 100

  return (
    <section
      className="rul-visual"
      aria-label={`Estimated remaining useful life: ${value} hours. Illustrative range ${low} to ${high} hours.`}
    >
      <div className="rul-heading">
        <div>
          <span className="eyebrow">ILLUSTRATIVE HORIZON</span>
          <h3><Clock3 size={15} /> Remaining useful life</h3>
        </div>
        <strong>{Math.round(value)}<small> hrs</small></strong>
      </div>
      <div className="rul-track" aria-hidden="true">
        <i className="rul-range" style={{ left: `${left}%`, width: `${width}%` }} />
        <i className="rul-marker" style={{ left: `${marker}%` }} />
      </div>
      <div className="rul-scale"><span>0 hrs</span><span>{Math.round(low)}–{Math.round(high)} hrs estimated range</span><span>{Math.round(max)} hrs</span></div>
      <p>Scenario-based demonstrator estimate; not a maintenance limit or flight-clearance value.</p>
    </section>
  )
}

export function MissionRecommendation({ recommendation, risk, fault }) {
  const details = recommendations[recommendation] || recommendations['RETURN TO BASE']
  const Icon = details.Icon

  return (
    <section className={`recommendation-panel ${details.className}`}>
      <div className="recommendation-heading">
        <span className="eyebrow">MISSION RECOMMENDATION · DEMONSTRATOR</span>
        <span className={`risk-chip ${String(risk).toLowerCase()}`}>RISK: {risk}</span>
      </div>
      <div className="recommendation-content">
        <Icon size={22} aria-hidden="true" />
        <div>
          <h2>{recommendation}</h2>
          <p>{details.action}</p>
          <small>Basis: {fault || 'Current simulated condition'} · review with an authorized operator.</small>
        </div>
      </div>
    </section>
  )
}
