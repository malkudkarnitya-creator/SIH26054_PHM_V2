import { Card, GaugeChart, SectionHeading, StatusBadge } from '../components'

export default function Health({ analysis }) {
  const { expected, estimated } = analysis
  return <><SectionHeading eyebrow="ENGINE HEALTH CENTER / DIGITAL TWIN" title="Expected vs actual state" action={<StatusBadge severity={analysis.severity}>{analysis.severity} SEVERITY</StatusBadge>} /><div className="health-layout"><Card className="gauge-card"><SectionHeading eyebrow="COMPOSITE SCORE" title="Propulsion health" /><GaugeChart value={analysis.health_score} /><p className="muted center">Health and risk scores are supplied by the backend analysis. Risk: {analysis.risk_score}%.</p></Card><Card><SectionHeading eyebrow="STATE COMPARISON" title="Engine parameters" /><div className="comparison-list">{[['RPM', 'rpm'], ['EGT', 'egt'], ['CHT', 'cht']].map(([label, key]) => <div className="comparison-row" key={label}><div><b>{label}</b><small>EXPECTED / ESTIMATED</small></div><span>{expected[key].toFixed(1)}</span><strong>{estimated[key].toFixed(1)}</strong><em>{analysis.residuals[key].toFixed(1)}</em></div>)}</div></Card></div></>
}
