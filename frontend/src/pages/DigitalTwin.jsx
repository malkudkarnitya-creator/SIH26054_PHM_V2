import { Activity } from 'lucide-react'
import { TwinChart } from '../components/Charts'
import { HealthScore, RemainingLife } from '../components/MissionMetrics'
import { useMission } from '../hooks/useMission'

const channels = [
  { label: 'RPM', field: 'rpm', expected: 6845, unit: 'RPM' },
  { label: 'CYLINDER HEAD TEMPERATURE', field: 'cht', expected: 185, unit: '°C' },
  { label: 'EXHAUST GAS TEMPERATURE', field: 'egt', expected: 641, unit: '°C' },
]

function ResidualMeter({ residual, expected }) {
  const normalized = Math.max(-50, Math.min(50, (residual / Math.max(1, expected)) * 100))
  const position = 50 + normalized

  return (
    <div className="residual-analysis" aria-label={`Residual ${residual >= 0 ? 'plus ' : ''}${residual.toFixed(1)}. ${Math.abs(normalized).toFixed(1)} percent deviation.`}>
      <span>RESIDUAL ANALYSIS</span>
      <div className="residual-track" aria-hidden="true">
        <i className="residual-zero" />
        <i className={`residual-point ${Math.abs(normalized) > 4 ? 'outside' : ''}`} style={{ left: `${position}%` }} />
      </div>
      <strong>{residual > 0 ? '+' : ''}{residual.toFixed(1)} <small>{Math.abs(normalized).toFixed(1)}% deviation</small></strong>
    </div>
  )
}

function TwinChannel({ channel, telemetry }) {
  const actual = telemetry.at(-1)?.[channel.field] ?? 0
  const residual = actual - channel.expected
  const outsideExpectedBand = Math.abs(residual) > channel.expected * 0.04

  return (
    <section className="twin-card">
      <header className="twin-heading">
        <div><span className="eyebrow">EXPECTED VS ACTUAL</span><h3>{channel.label}</h3></div>
        <span className={`residual-status ${outsideExpectedBand ? 'watch' : 'nominal'}`}>
          {outsideExpectedBand ? 'REVIEW' : 'WITHIN BAND'}
        </span>
      </header>
      <div className="twin-values">
        <span>EXPECTED <b>{channel.expected} <small>{channel.unit}</small></b></span>
        <span>ACTUAL <b>{Number(actual).toFixed(1)} <small>{channel.unit}</small></b></span>
      </div>
      <TwinChart data={telemetry} field={channel.field} expected={channel.expected} />
      <ResidualMeter residual={residual} expected={channel.expected} />
    </section>
  )
}

export default function DigitalTwin() {
  const mission = useMission()

  return (
    <>
      <section className="page-title">
        <div>
          <span className="eyebrow">PREDICTIVE ENGINE MODEL · UAV-01 · SIMULATION</span>
          <h2>Digital twin</h2>
          <p>Compare the mock sensor stream with nominal references and inspect residuals.</p>
        </div>
        <div className="mission-state" role="status"><i /> MODEL DEMONSTRATION</div>
      </section>

      <div className="twin-overview">
        <section className="panel twin-health">
          <div><span className="eyebrow">COMPOSITE CONDITION</span><h3><Activity size={15} /> Health indicators</h3></div>
          <HealthScore value={mission.health} />
        </section>
        <section className="panel twin-rul">
          <RemainingLife
            hours={mission.rul}
            lower={mission.rulRange.lower}
            upper={mission.rulRange.upper}
          />
        </section>
      </div>

      <section className="twin-grid" aria-label="Engine expected versus actual and residuals">
        {channels.map((channel) => (
          <TwinChannel key={channel.field} channel={channel} telemetry={mission.telemetry} />
        ))}
      </section>
      <p className="twin-disclaimer">Nominal references and remaining-life estimates are illustrative demonstrator values, not calibrated aircraft limits.</p>
    </>
  )
}
