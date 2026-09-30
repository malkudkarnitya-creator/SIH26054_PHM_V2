import { Activity } from 'lucide-react'
import { TwinChart } from '../components/Charts'
import { HealthScore, RemainingLife } from '../components/MissionMetrics'
import { useMission } from '../hooks/useMission'

const channels = [
  { label: 'RPM', field: 'rpm', expected: 8200, tolerance: 500, unit: 'RPM' },
  { label: 'EXHAUST GAS TEMPERATURE', field: 'egt', expected: 650, tolerance: 45, unit: '°C' },
  { label: 'CYLINDER HEAD TEMPERATURE', field: 'cht', expected: 190, tolerance: 15, unit: '°C' },
  { label: 'FUEL FLOW', field: 'fuel_flow', expected: 3.5, tolerance: 0.6, unit: 'L/hr' },
  { label: 'VIBRATION', field: 'vibration', expected: 0.2, tolerance: 0.08, unit: 'g' },
  { label: 'OIL TEMPERATURE', field: 'oil_temperature', expected: 82, tolerance: 8, unit: '°C' },
]

function ResidualMeter({ residual, expected, tolerance }) {
  const normalized = Math.max(-50, Math.min(50, (residual / Math.max(0.01, Math.abs(expected))) * 100))
  const position = 50 + normalized
  const outsideExpectedBand = Math.abs(residual) > tolerance

  return (
    <div className="residual-analysis" aria-label={`Residual ${residual >= 0 ? 'plus ' : ''}${residual.toFixed(2)}. ${Math.abs(normalized).toFixed(1)} percent deviation.`}>
      <span>RESIDUAL ANALYSIS</span>
      <div className="residual-track" aria-hidden="true">
        <i className="residual-zero" />
        <i className={`residual-point ${outsideExpectedBand ? 'outside' : ''}`} style={{ left: `${position}%` }} />
      </div>
      <strong>{residual > 0 ? '+' : ''}{residual.toFixed(2)} <small>{Math.abs(normalized).toFixed(1)}% deviation</small></strong>
    </div>
  )
}

function TwinChannel({ channel, telemetry }) {
  const actual = telemetry.at(-1)?.[channel.field] ?? 0
  const residual = actual - channel.expected
  const outsideExpectedBand = Math.abs(residual) > channel.tolerance

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
      <ResidualMeter residual={residual} expected={channel.expected} tolerance={channel.tolerance} />
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
      <section className="twin-values-table" aria-labelledby="twin-table-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CURRENT OPERATING POINT</span>
            <h2 id="twin-table-title">Actual vs expected values</h2>
          </div>
        </div>
        <div className="twin-table-scroll">
          <table>
            <thead>
              <tr><th>PARAMETER</th><th>ACTUAL</th><th>EXPECTED</th><th>RESIDUAL (ACTUAL − EXPECTED)</th><th>INDICATOR</th></tr>
            </thead>
            <tbody>
              {channels.map((channel) => {
                const actual = Number(mission.latest[channel.field])
                const residual = actual - channel.expected
                const warning = Math.abs(residual) > channel.tolerance
                return (
                  <tr key={channel.field}>
                    <td>{channel.label}</td>
                    <td>{actual.toFixed(channel.field === 'fuel_flow' || channel.field === 'vibration' ? 2 : 1)} {channel.unit}</td>
                    <td>{channel.expected} {channel.unit}</td>
                    <td className={warning ? 'residual-warning' : 'residual-normal'}>
                      {residual > 0 ? '+' : ''}{residual.toFixed(2)} {channel.unit}
                    </td>
                    <td><span className={`residual-status ${warning ? 'watch' : 'nominal'}`}>{warning ? 'OUT OF BAND' : 'NOMINAL'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="twin-disclaimer">Nominal references and remaining-life estimates are illustrative demonstrator values, not calibrated aircraft limits.</p>
    </>
  )
}
