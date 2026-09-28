import { useMemo, useState } from 'react'
import { Activity, Crosshair, Plane, ShieldAlert, ShieldCheck, Users } from 'lucide-react'

const tone = value => value >= 90 ? 'nominal' : value >= 75 ? 'monitor' : 'critical'
const n = value => Number(value || 0).toFixed(0)

export default function FleetCommandCenter({ fleet }) {
  const [selected, setSelected] = useState('VAYU-01')
  const asset = useMemo(() => fleet?.assets.find(item => item.engine_id === selected), [fleet, selected])
  if (!fleet) return <section className="v-panel fleet-loading"><Activity size={18}/><span>Synchronising fleet operational picture…</span></section>
  const { summary, assets } = fleet
  return <section className="fleet-command" id="fleet">
    <div className="v-section-heading"><div><span className="v-eyebrow">FLEET MISSION ASSURANCE / MULTI-UAV OPERATIONS</span><h2><Users size={20}/> Fleet command center</h2></div><span><Activity size={14}/> {summary.asset_count} assets / 5 s condition refresh</span></div>
    <div className="fleet-kpis">
      <article><span>FLEET READINESS</span><b>{n(summary.fleet_readiness_score)}<small>%</small></b><i className="nominal"/></article>
      <article><span>MISSION AVAILABLE</span><b>{summary.mission_available}<small> / {summary.asset_count}</small></b><i className="blue"/></article>
      <article><span>FLEET HEALTH</span><b>{n(summary.fleet_health)}<small> / 100</small></b><i className="purple"/></article>
      <article><span>HIGH-RISK ASSETS</span><b>{summary.high_risk_assets}<small> flagged</small></b><i className={summary.high_risk_assets ? 'amber' : 'nominal'}/></article>
    </div>
    <div className="fleet-grid">
      <article className="v-panel fleet-map"><div className="v-panel-head"><div><span className="v-eyebrow">RISK MAP / ASSET POSITIONING</span><h3><Crosshair size={16}/> Operational sectors</h3></div><span className="v-muted">SELECT AN AIRCRAFT</span></div>
        <div className="fleet-radar"><span className="radar-ring one"/><span className="radar-ring two"/><span className="radar-axis vertical"/><span className="radar-axis horizontal"/>{assets.map(item => <button key={item.engine_id} onClick={() => setSelected(item.engine_id)} className={`fleet-blip ${tone(item.health_index)} ${selected === item.engine_id ? 'selected' : ''}`} style={{ left: `${item.coordinates.x}%`, top: `${item.coordinates.y}%` }} aria-label={`Select ${item.engine_id}, health ${item.health_index}`}><Plane size={13}/><b>{item.engine_id.slice(-2)}</b></button>)}</div>
        <div className="fleet-map-key"><span><i className="nominal"/> ready ≥ 90</span><span><i className="monitor"/> monitor 75–89</span><span><i className="critical"/> action &lt; 75</span></div>
      </article>
      <article className="v-panel fleet-asset"><div className="v-panel-head"><div><span className="v-eyebrow">SELECTED ASSET / CONDITION SUMMARY</span><h3><ShieldCheck size={16}/> {asset?.engine_id} · {asset?.sector}</h3></div><span className={`v-badge ${tone(asset?.health_index) === 'critical' ? 'amber' : 'green'}`}>{asset?.readiness}</span></div>
        <div className="fleet-selected-score"><strong>{n(asset?.health_index)}</strong><span>health index</span><div><b>{n(asset?.reliability_percent)}%</b><small>mission success</small></div></div>
        <dl><div><dt>Predicted RUL</dt><dd>{n(asset?.rul_hours)} h</dd></div><div><dt>Engine failure probability</dt><dd>{n(asset?.risk_percent)}%</dd></div><div><dt>Callsign</dt><dd>{asset?.callsign}</dd></div></dl>
        <p><ShieldAlert size={14}/> Fleet view is a live demonstrator operational picture. VAYU-01 is bound to the full digital twin; companion assets retain independent condition offsets for parallel mission triage.</p>
      </article>
    </div>
    <div className="fleet-asset-table">{assets.map(item => <button key={item.engine_id} onClick={() => setSelected(item.engine_id)} className={selected === item.engine_id ? 'selected' : ''}><span className={`fleet-state ${tone(item.health_index)}`}/><b>{item.engine_id}</b><small>{item.sector}</small><strong>{n(item.health_index)}</strong><em>{n(item.rul_hours)} h RUL</em><i>{item.readiness}</i></button>)}</div>
  </section>
}
