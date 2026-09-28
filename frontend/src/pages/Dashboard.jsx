import { useMission } from '../hooks/useMission'
import { HealthScore, MissionRecommendation, RemainingLife } from '../components/MissionMetrics'

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

  return (
    <>
      <section className="page-title">
        <div>
          <span className="eyebrow">UAV-01 · PROPULSION SYSTEM · SIMULATION</span>
          <h2>Mission overview</h2>
          <p>Engine condition snapshot for the local mission demonstrator.</p>
        </div>
        <div className="mission-state" role="status"><i /> DEMO · {mission.mission}</div>
      </section>

      <div className="metric-grid">
        <MetricCard label="HEALTH SCORE" value={mission.health} unit="/100" detail="Scenario health index" tone={mission.health < 70 ? 'red' : 'green'} />
        <MetricCard label="REMAINING USEFUL LIFE" value={mission.rul} unit="hrs" detail="Illustrative scenario estimate" />
        <MetricCard label="CURRENT FAULT" value={mission.fault} detail="Local scenario classification" tone={mission.scenario === 'normal' ? 'green' : 'amber'} />
        <MetricCard label="MISSION STATUS" value={mission.mission} detail="Simulated mission state" />
        <MetricCard label="RISK LEVEL" value={mission.risk} detail="Scenario risk category" tone={mission.risk === 'LOW' ? 'green' : 'red'} />
      </div>

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
            <span>Data integrity <b>Not assessed</b></span>
          </div>
        </section>
      </div>
      <Inject />
    </>
  )
}
