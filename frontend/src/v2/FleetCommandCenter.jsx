import { useMemo, useState } from 'react'
import { Activity, Crosshair, Plane, ShieldAlert, ShieldCheck, Users } from 'lucide-react'

const tone = value => value >= 85 ? 'nominal' : value >= 70 ? 'monitor' : 'critical'
const n = value => Number(value || 0).toFixed(0)
const readinessForHealth = value => value >= 85
  ? 'ACTIVE'
  : value >= 70
    ? 'WARNING'
    : 'MAINTENANCE REQUIRED'
const demoAssets = [
  {
    engine_id: 'VAYU-03',
    sector: 'WEST',
    callsign: 'MALE-03',
    coordinates: { x: 27, y: 66 },
    health_index: 67,
    reliability_percent: 68,
    rul_hours: 74,
    risk_percent: 32,
    readiness: 'MAINTENANCE REQUIRED',
  },
  {
    engine_id: 'VAYU-04',
    sector: 'SOUTH',
    callsign: 'MALE-04',
    coordinates: { x: 72, y: 73 },
    health_index: 96,
    reliability_percent: 97,
    rul_hours: 342,
    risk_percent: 3,
    readiness: 'ACTIVE',
  },
  {
    engine_id: 'VAYU-05',
    sector: 'EAST',
    callsign: 'MALE-05',
    coordinates: { x: 77, y: 35 },
    health_index: 79,
    reliability_percent: 83,
    rul_hours: 156,
    risk_percent: 17,
    readiness: 'MONITOR',
  },
]

export default function FleetCommandCenter({ fleet, lastUpdated }) {
  const [selected, setSelected] = useState('')
  const assets = useMemo(
    () => [
      ...(fleet?.assets ?? []),
      ...demoAssets
        .filter(item => !(fleet?.assets ?? []).some(asset => asset.engine_id === item.engine_id))
        .slice(0, Math.max(0, 3 - (fleet?.assets.length ?? 0))),
    ],
    [fleet?.assets],
  )
  if (!fleet) return <section className="v-panel fleet-loading"><Activity size={18}/><span>Synchronising fleet operational picture…</span></section>
  const activeId = assets.some(item => item.engine_id === selected)
    ? selected
    : assets.find(item => item.engine_id === 'VAYU-01')?.engine_id ?? assets[0]?.engine_id
  const asset = assets.find(item => item.engine_id === activeId)
  const summary = {
    ...fleet.summary,
    asset_count: assets.length,
    fleet_readiness_score: (assets.filter(item => item.health_index >= 85).length / assets.length) * 100,
    fleet_health: assets.reduce((total, item) => total + item.health_index, 0) / assets.length,
    mission_available: assets.filter(item => item.health_index >= 70).length,
    high_risk_assets: assets.filter(item => item.health_index < 70).length,
  }
  return <section className="fleet-command" id="fleet">
    <div className="v-section-heading"><div><span className="v-eyebrow">FLEET MISSION ASSURANCE / MULTI-UAV OPERATIONS</span><h2><Users size={20}/> Fleet command center</h2></div><span><Activity size={14}/> {summary.asset_count} assets · last update {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'awaiting first refresh'}</span></div>
    <div className="fleet-kpis">
      <article><span>FLEET READINESS</span><b>{n(summary.fleet_readiness_score)}<small>%</small></b><i className="nominal"/></article>
      <article><span>MISSION AVAILABLE</span><b>{summary.mission_available}<small> / {summary.asset_count}</small></b><i className="blue"/></article>
      <article><span>FLEET HEALTH</span><b>{n(summary.fleet_health)}<small> / 100</small></b><i className="purple"/></article>
      <article><span>HIGH-RISK ASSETS</span><b>{summary.high_risk_assets}<small> flagged</small></b><i className={summary.high_risk_assets ? 'amber' : 'nominal'}/></article>
    </div>
    <div className="fleet-grid">
      <article className="v-panel fleet-map"><div className="v-panel-head"><div><span className="v-eyebrow">RISK MAP / ASSET POSITIONING</span><h3><Crosshair size={16}/> Operational sectors</h3></div><span className="v-muted">SELECT AN AIRCRAFT</span></div>
        <div className="fleet-radar"><span className="radar-ring one"/><span className="radar-ring two"/><span className="radar-axis vertical"/><span className="radar-axis horizontal"/>{assets.map(item => <button key={item.engine_id} onClick={() => setSelected(item.engine_id)} className={`fleet-blip ${tone(item.health_index)} ${activeId === item.engine_id ? 'selected' : ''}`} style={{ left: `${item.coordinates.x}%`, top: `${item.coordinates.y}%` }} aria-label={`Select ${item.engine_id}, health ${item.health_index}`}><Plane size={13}/><b>{item.engine_id.slice(-2)}</b></button>)}</div>
        <div className="fleet-map-key"><span><i className="nominal"/> ready ≥ 85</span><span><i className="monitor"/> warning 70–84</span><span><i className="critical"/> maintenance &lt; 70</span></div>
      </article>
      <article className="v-panel fleet-asset"><div className="v-panel-head"><div><span className="v-eyebrow">SELECTED ASSET / CONDITION SUMMARY</span><h3><ShieldCheck size={16}/> {asset?.engine_id} · {asset?.sector}</h3></div><span className={`v-badge ${tone(asset?.health_index) === 'critical' ? 'amber' : tone(asset?.health_index) === 'monitor' ? 'amber' : 'green'}`}>{readinessForHealth(asset?.health_index)}</span></div>
        <div className="fleet-selected-score"><strong>{n(asset?.health_index)}</strong><span>health index</span><div><b>{n(asset?.reliability_percent)}%</b><small>mission success</small></div></div>
        <dl><div><dt>Predicted RUL</dt><dd>{n(asset?.rul_hours)} h</dd></div><div><dt>Engine failure probability</dt><dd>{n(asset?.risk_percent)}%</dd></div><div><dt>Callsign</dt><dd>{asset?.callsign}</dd></div></dl>
        <p><ShieldAlert size={14}/> Fleet view is a live demonstrator operational picture. VAYU-01 is bound to the full digital twin; companion assets retain independent condition offsets for parallel mission triage.</p>
      </article>
    </div>
    <div className="fleet-asset-table">{assets.map(item => <button key={item.engine_id} onClick={() => setSelected(item.engine_id)} className={`${activeId === item.engine_id ? 'selected' : ''} ${tone(item.health_index)}`}><span className={`fleet-state ${tone(item.health_index)}`}/><b>{item.engine_id}</b><small>{item.sector}</small><div className="fleet-card-visual"><Plane size={20}/><strong style={{ '--health': `${item.health_index}%` }}>{n(item.health_index)}</strong></div><em>{n(item.rul_hours)} h RUL</em><i>{readinessForHealth(item.health_index)}</i></button>)}</div>
  </section>
}
