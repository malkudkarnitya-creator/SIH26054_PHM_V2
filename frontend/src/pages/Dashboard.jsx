import { Link } from 'react-router-dom'
import { Award, Layers, ArrowRight, Sparkles } from 'lucide-react'
import { useMission } from '../hooks/useMission'
import { HealthScore, MissionRecommendation, RemainingLife } from '../components/MissionMetrics'
import { TelemetryChart } from '../components/Charts'
import MissionEnvironment from '../components/MissionEnvironment'
import MissionDecisionCard from '../components/MissionDecisionCard'

function MetricCard({ label, value, unit, detail, tone = '' }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}<small>{unit}</small></strong>
      <p>{detail}</p>
    </article>
  )
}

export function Inject() {
  const { scenario, setScenario } = useMission()
  const scenarios = [
    ['cooling', 'Inject cooling fault'],
    ['sensor', 'Inject sensor fault'],
    ['bearing', 'Inject bearing wear'],
    ['degradation', 'Inject engine degradation'],
  ]

  return (
    <section className="fault-injector" aria-labelledby="fault-injector-title">
      <div>
        <span className="eyebrow">SIMULATION CONTROLS</span>
        <h3 id="fault-injector-title">Fault injection demo</h3>
        <p>Change the local mock telemetry scenario. No aircraft or backend is controlled.</p>
      </div>
      <div className="fault-actions">
        {scenarios.map(([value, label]) => (
          <button
            className={scenario === value ? 'selected' : ''}
            aria-pressed={scenario === value}
            onClick={() => setScenario(value)}
            key={value}
          >
            {label}
          </button>
        ))}
        <button className="reset" onClick={() => setScenario('normal')}>Reset nominal</button>
      </div>
    </section>
  )
}

export function Recommendation() {
  const { recommendation, risk, fault } = useMission()
  return <MissionRecommendation recommendation={recommendation} risk={risk} fault={fault} />
}

export default function Dashboard() {
  const mission = useMission()
  const latest = mission.latest
  const readings = [
    ['RPM', 'rpm', 'RPM', 0],
    ['EGT', 'egt', '°C', 1],
    ['CHT', 'cht', '°C', 1],
    ['FUEL FLOW', 'fuel_flow', 'L/hr', 2],
    ['VIBRATION', 'vibration', 'mm/s', 2],
    ['OIL TEMPERATURE', 'oil_temperature', '°C', 1],
  ]

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content">
        <section
          style={{
            marginBottom: '25px',
            padding: '24px 28px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(19, 39, 48, 0.95), rgba(11, 20, 26, 0.95))',
            border: '1px solid rgba(99, 221, 188, 0.2)',
          }}
        >
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '0.05em',
              color: '#f0f7f7',
              margin: '0 0 8px 0',
            }}
          >
            SKYNEX PHM
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#88a3ad',
              margin: 0,
              letterSpacing: '0.02em',
            }}
          >
            AI-Powered Predictive Health Monitoring for UAV Fleets
          </p>
        </div>
      </section>

      <section className="page-title">
        <div>
          <span className="eyebrow">UAV-01 · PROPULSION SYSTEM · SIMULATION</span>
          <h2>Mission overview</h2>
          <p>Engine condition snapshot for the local mission demonstrator.</p>
        </div>
        <div className="mission-state" role="status"><i /> DEMO · {mission.mission}</div>
      </section>

      {/* SIH26054 Evaluator Quick Access Strip */}
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
          padding: '14px 20px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(19, 39, 48, 0.95), rgba(11, 20, 26, 0.95))',
          border: '1px solid rgba(99, 221, 188, 0.25)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}
        aria-label="Judge evaluation quick access"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(99, 221, 188, 0.15)',
              border: '1px solid rgba(99, 221, 188, 0.35)',
              color: '#63ddbc',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Award size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  font: "700 8px 'DM Mono', monospace",
                  letterSpacing: '1px',
                  color: '#63ddbc',
                  background: 'rgba(99, 221, 188, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
              >
                SIH26054 EVALUATION MODE
              </span>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f0f7f7', margin: '4px 0 2px' }}>
              Judge Demo Walkthrough & Architecture Diagrams
            </h3>
            <p style={{ fontSize: '11px', color: '#88a3ad', margin: 0 }}>
              Launch 1-click deterministic fault scenarios (Engine Degradation, Compressor Fouling, Fuel Leak, Sensor Bias) or view aerospace SVG architecture diagrams.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/judge-demo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#63ddbc',
              color: '#0a1d19',
              fontWeight: '600',
              fontSize: '11px',
              borderRadius: '6px',
              textDecoration: 'none',
              boxShadow: '0 0 16px rgba(99, 221, 188, 0.25)',
            }}
          >
            <Sparkles size={13} />
            <span>Launch Judge Demo</span>
            <ArrowRight size={13} />
          </Link>
          <Link
            to="/architecture"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#c9d7de',
              fontWeight: '500',
              fontSize: '11px',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            <Layers size={13} />
            <span>View Architecture</span>
          </Link>
        </div>
      </section>

      <div className="metric-grid">
        <MetricCard label="HEALTH SCORE" value={mission.health} unit="/100" detail="Calculated from current telemetry" tone={mission.health < 60 ? 'red' : mission.health <= 85 ? 'amber' : 'green'} />
        <MetricCard label="REMAINING USEFUL LIFE" value={mission.rul.toFixed(1)} unit="hrs" detail="Health-derived estimate" tone={mission.health < 60 ? 'red' : ''} />
        <MetricCard label="CURRENT FAULT" value={mission.fault} detail="Live telemetry classification" tone={mission.faultClassification === 'HEALTHY' ? 'green' : 'amber'} />
        <MetricCard label="MISSION STATUS" value={mission.mission} detail="Simulated mission state" />
        <MetricCard label="MISSION RECOMMENDATION" value={mission.recommendation} detail="Threshold-based action" tone={mission.health < 60 ? 'red' : mission.health <= 85 ? 'amber' : 'green'} />
      </div>

      <MissionEnvironment />

      <div className="overview-grid">
        <Recommendation />
        <section className="panel health-panel" aria-label="Engine health and remaining life">
          <div className="dashboard-health">
            <div>
              <span className="eyebrow">PROPULSION READINESS</span>
              <HealthScore value={mission.health} />
            </div>
            <RemainingLife
              hours={mission.rul}
              lower={mission.rulRange.lower}
              upper={mission.rulRange.upper}
            />
          </div>
          <div className="readiness">
            <span>Data source <b>Local simulation</b></span>
            <span>Data integrity <b>Synthetic stream</b></span>
          </div>
        </section>
      </div>

      <div className="mission-decision-section">
        <MissionDecisionCard
          health={mission.health}
          rul={mission.rul}
          fault={mission.fault}
          faultClassification={mission.faultClassification}
        />
      </div>
      <section className="live-readouts" aria-labelledby="live-readouts-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">UAV-01 · 1 HZ SYNTHETIC STREAM</span>
            <h2 id="live-readouts-title">Live telemetry</h2>
          </div>
          <div className="mission-state" role="status"><i /> REFRESHING EVERY 2 S</div>
        </div>
        <div className="live-readout-grid">
          {readings.map(([label, field, unit, digits]) => (
            <article className="live-readout" key={field}>
              <span>{label}</span>
              <strong>{Number(latest?.[field] ?? 0).toFixed(digits)}<small>{unit}</small></strong>
              <small className="readout-status">CURRENT SAMPLE</small>
            </article>
          ))}
        </div>
      </section>
      <section className="dashboard-live-charts" aria-label="Live engine telemetry charts">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ROLLING SENSOR HISTORY</span>
            <h2>Live engine trends</h2>
          </div>
        </div>
        <div className="dashboard-chart-grid">
          {[
            ['rpm', 'ENGINE RPM', '#35b9ff'],
            ['egt', 'EXHAUST GAS TEMPERATURE', '#ff7b6b'],
            ['cht', 'CYLINDER HEAD TEMPERATURE', '#ffb955'],
            ['fuel_flow', 'FUEL FLOW', '#9b8cff'],
            ['vibration', 'VIBRATION', '#45d7aa'],
          ].map(([field, title, color]) => (
            <TelemetryChart
              key={field}
              data={mission.telemetry.slice(-60)}
              field={field}
              title={title}
              color={color}
            />
          ))}
        </div>
      </section>
      <Inject />
      </div>
      <svg
        className="uav-watermark"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M100 20L120 60H160L130 85L145 130L100 105L55 130L70 85L40 60H80L100 20Z"
          fill="currentColor"
          opacity="0.12"
        />
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" opacity="0.08" />
        <path
          d="M100 40L115 70H145L125 90L135 120L100 100L65 120L75 90L55 70H85L100 40Z"
          fill="currentColor"
          opacity="0.10"
        />
      </svg>
    </div>
  )
}
