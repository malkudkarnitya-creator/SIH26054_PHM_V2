import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Box, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Download, ExternalLink, FileText, FlaskConical, Gauge, Layers3, Menu, Pause, Play, Radio, RefreshCw, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Target, Thermometer, TriangleAlert, Wind, Wrench, X, Zap } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import EngineTwin from './EngineTwin'
const MissionVisuals = lazy(() => import('./MissionVisuals').then((module) => ({ default: module.MissionVisuals })))
const FleetCommandCenter = lazy(() => import('./FleetCommandCenter'))
import { request } from './api'
import { useFleet } from './useFleet'
import { useTwin } from './useTwin'
import './v2.css'

const navigation = [
  ['fleet', 'Fleet command', Layers3],
  ['mission-control', 'Mission control', Gauge], ['digital-twin', 'Digital twin', Box],
  ['prognostics', 'Predictive maintenance', Activity], ['mission', 'Mission reliability', ShieldCheck],
  ['simulation', 'What-if simulator', SlidersHorizontal], ['maintenance', 'Maintenance', Wrench],
]
const sensorOrder = ['rpm', 'egt', 'cht', 'oil_temperature', 'oil_pressure', 'fuel_flow', 'vibration']
const sensorNames = { rpm: 'Engine speed', egt: 'Exhaust gas', cht: 'Cylinder head', oil_temperature: 'Oil temperature', oil_pressure: 'Oil pressure', fuel_flow: 'Fuel flow', vibration: 'Vibration' }
const scenarios = { nominal: 'Healthy mission', engine_degradation: 'Engine degradation', sensor_bias: 'Sensor bias', fuel_leak: 'Fuel leak', compressor_fouling: 'Compressor fouling', engine_overheating: 'Engine overheating', cooling_loss: 'Cooling failure', sensor_drift: 'Sensor drift', oil_leak: 'Oil pressure loss', bearing_wear: 'Bearing wear', fuel_restriction: 'Fuel starvation' }
const demoScenarios = [
  ['nominal', 'Healthy flight'],
  ['engine_degradation', 'Engine degradation sequence'],
  ['sensor_bias', 'Sensor bias sequence'],
  ['fuel_leak', 'Fuel leak sequence'],
  ['compressor_fouling', 'Compressor fouling sequence'],
]
const tooltipStyle = { background: '#14232d', border: '1px solid #354a55', borderRadius: 8, fontSize: 12, color: '#e6f1f3' }
const fmt = (n, digits = 1) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })
function sparkline(rows, key) {
  const values = rows.slice(-24).map(row => row.sensors[key]); const low = Math.min(...values); const span = Math.max(.01, Math.max(...values) - low)
  return values.map((value, index) => `${index ? "L" : "M"}${index / Math.max(1, values.length - 1) * 94} ${22 - (value - low) / span * 18}`).join(" ")
}
const timeLabel = value => value ? new Date(value).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' }) : '—'
function Badge({ children, tone = 'green' }) { return <span className={`v-badge ${tone}`}>{children}</span> }
function SectionHead({ eyebrow, title, children, icon: Icon }) { return <div className="v-panel-head"><div>{eyebrow && <span className="v-eyebrow">{eyebrow}</span>}<h3>{Icon && <Icon size={16}/>} {title}</h3></div>{children}</div> }
function Metric({ icon: Icon, label, value, unit, sub, children, tone = 'green' }) {
  return <article className={`v-metric ${tone}`}><div className="v-metric-top"><span>{label}</span><Icon size={17}/></div><div className="v-metric-value">{value}<small>{unit}</small></div><div className="v-metric-bottom">{children || <span>{sub}</span>}</div></article>
}
function Slider({ label, value, onChange, min, max, step = 1, unit, signed = false }) {
  return <label className="v-slider"><span>{label}<b>{signed && value > 0 ? '+' : ''}{value}{unit}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/><span className="v-range-label"><small>{min}{unit}</small><small>{max}{unit}</small></span></label>
}
function certaintyLabel(value) { return value >= 95 ? 'Very high' : value >= 85 ? 'High' : value >= 70 ? 'Medium' : 'Low' }
function FaultPropagation({ data }) {
  const progress = data.fault_progress; const isFault = progress.scenario !== 'nominal'
  const events = [['00:00', 'Fault injected', isFault], ['00:10', 'Sensor deviation detected', progress.detected], ['00:18', 'Anomaly detected', progress.anomaly_detected], ['00:25', 'Health index updated', progress.anomaly_detected], ['00:35', 'RUL recalculated', progress.root_cause_identified], ['00:45', 'Maintenance recommendation', progress.maintenance_ready]]
  return <section className="v-panel fault-propagation" aria-label="Fault propagation timeline"><SectionHead title="Fault propagation timeline" eyebrow="CAUSE → EFFECT → ACTION" icon={Activity}><Badge tone={isFault ? 'amber' : 'green'}>{isFault ? `${fmt(progress.severity_percent, 0)}% EVIDENCE` : 'STANDBY'}</Badge></SectionHead><div className="propagation-track">{events.map(([time, label, active], index) => <div className={`propagation-event ${active ? 'active' : ''}`} key={label}><i>{index + 1}</i><span>{time}</span><b>{label}</b></div>)}</div><p className="v-model-note">{isFault ? `${scenarios[progress.scenario]} has progressed for ${fmt(progress.elapsed_seconds, 0)} s. Each stage is enabled only by accumulated model evidence.` : 'Inject a fault to show the complete detection, diagnosis, RUL and maintenance sequence.'}</p></section>
}

export default function V2App() {
  const { snapshot: data, history, connection, error, accept } = useTwin()
  const { fleet, error: fleetError } = useFleet()
  const [active, setActive] = useState('overview')
  const [mobile, setMobile] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState('cylinder')
  const [signal, setSignal] = useState('egt')
  const [missionDraft, setMissionDraft] = useState(null)
  const [whatIf, setWhatIf] = useState({ rpm_adjustment: -300, temperature_variation: 5, fuel_flow_variation: 0, horizon_minutes: 15 })
  const [forecast, setForecast] = useState(null)
  const [forecastBusy, setForecastBusy] = useState(false)
  const [modelInfo, setModelInfo] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [presentation, setPresentation] = useState(false)
  function navigate(id) { setActive(id); setMobile(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  async function control(patch) {
    setBusy(true); setActionError(''); setNotice('')
    try { accept(await request('/controls', { ...data.controls, ...patch })); setNotice('Engine configuration updated.'); return true }
    catch (err) { setActionError(err.message); return false }
    finally { setBusy(false) }
  }
  async function simulate() {
    setForecastBusy(true); setActionError('')
    try { setForecast(await request('/what-if', whatIf)) }
    catch (err) { setActionError(err.message) }
    finally { setForecastBusy(false) }
  }
  async function exportReport() {
    setActionError('')
    try {
      const report = await request('/report')
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = `VAYU-01-condition-${Date.now()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('Condition report exported with telemetry and model assumptions.')
    } catch (err) { setActionError(err.message) }
  }
  async function exportPdfReport() {
    if (!data) return
    setActionError('')
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF()
      const line = (text, y, size = 11) => { pdf.setFontSize(size); pdf.text(String(text), 18, y); return y + size * .65 + 4 }
      pdf.setFillColor(9, 15, 20); pdf.rect(0, 0, 210, 297, 'F'); pdf.setTextColor(225, 238, 237)
      let y = line('SKYNEX / VAYU-01 MISSION CONDITION REPORT', 22, 17)
      y = line('SIH26054 AI-ENABLED DIGITAL TWIN SYSTEM', y, 9)
      pdf.setDrawColor(99, 221, 188); pdf.line(18, y + 2, 192, y + 2); y += 14
      y = line(`Generated: ${new Date().toISOString()}`, y, 9)
      y = line(`Health score: ${fmt(data.health_index)} / 100`, y)
      y = line(`Mission reliability: ${fmt(data.mission.reliability_percent)}%`, y)
      y = line(`Remaining useful life: ${fmt(data.rul.hours, 0)} hours`, y)
      y += 5; y = line(`Decision: ${data.mission.decision}`, y, 13)
      y = line(`Primary condition: ${data.maintenance[0]?.failure_mode || 'Healthy operating state'}`, y)
      y = line(`Recommended action: ${data.maintenance[0]?.recommended_action || 'Continue scheduled inspection.'}`, y, 10)
      y += 7; y = line('EXPLAINABILITY', y, 13)
      data.explainability.reasoning.slice(0, 5).forEach((reason) => { y = line(`- ${reason}`, y, 10) })
      y += 7; y = line('MAINTENANCE RECOMMENDATION', y, 13)
      y = line(`Criticality: ${data.maintenance[0]?.priority || 'routine'}`, y)
      y = line(`Inspection date: ${new Date(Date.now() + data.rul.hours * 3600 * 1000).toLocaleDateString('en-GB')}`, y)
      y += 10; pdf.setTextColor(125, 146, 158); line('Synthetic research demonstrator. Not flight clearance or an airworthiness determination.', y, 8)
      pdf.save(`VAYU-01-condition-${Date.now()}.pdf`)
      setNotice('PDF mission condition report downloaded.')
    } catch (err) { setActionError(`PDF export failed: ${err.message}`) }
  }
  async function advanceDemo() {
    const current = demoScenarios.findIndex(([key]) => key === data?.controls.scenario)
    const [scenario, label] = demoScenarios[(current + 1) % demoScenarios.length]
    if (await control({ source: 'simulation', running: true, scenario })) setNotice(`Demo Mode: ${label}`)
  }
  useEffect(() => {
    if (!presentation || !data || busy) return undefined
    const timer = setTimeout(async () => {
      const current = demoScenarios.findIndex(([key]) => key === data.controls.scenario)
      const [scenario, label] = demoScenarios[(current + 1) % demoScenarios.length]
      try {
        const next = await request('/controls', { ...data.controls, source: 'simulation', running: true, scenario })
        accept(next); setNotice(`Presentation sequence: ${label}`)
      } catch (err) { setActionError(`Presentation mode paused: ${err.message}`); setPresentation(false) }
    }, 6500)
    return () => clearTimeout(timer)
  }, [presentation, data, busy, accept])
  const live = data?.quality.status === 'live' && ['streaming', 'polling'].includes(connection)
  const mission = missionDraft || data?.controls.mission
  const features = data?.explainability.features || []
  const sensor = features.find(item => item.key === signal)
  const trend = history.map(row => ({ time: row.timestamp, observed: row.sensors[signal], expected: row.expected[signal] }))
  const faults = data?.maintenance.filter(item => item.priority !== 'routine') || []
  const decisionTone = data?.mission.decision === 'WITHIN DEMO ENVELOPE' ? 'green' : data?.mission.decision === 'HOLD / INSPECT' ? 'red' : 'amber'
  const draftChanged = missionDraft && JSON.stringify(missionDraft) !== JSON.stringify(data?.controls.mission)
  return <div className="v2">
    {mobile && <button className="v-overlay" aria-label="Close navigation" onClick={() => setMobile(false)}/>}
    <aside className={`v-sidebar ${mobile ? 'open' : ''}`}>
      <a className="v-brand" href="#overview" onClick={() => navigate('overview')}><div className="v-brand-mark"><Wind size={26}/></div><div>SKYNEX<span>ENGINE INTELLIGENCE</span></div><b>02</b></a>
      <div className="v-workspace"><div className="v-workspace-icon"><Layers3 size={19}/></div><div><b>Aerospace systems</b><small>SIH26054 · Research platform</small></div></div>
      <p className="v-nav-caption">ENGINE OPERATIONS</p>
      <nav aria-label="Engine operations">{navigation.map(([id, label, Icon]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span>{id === 'maintenance' && faults.length > 0 ? <b className="v-nav-count">{faults.length}</b> : active === id && <i/>}</button>)}</nav>
      <p className="v-nav-caption v-tools-caption">ENGINEERING TOOLS</p>
      <nav aria-label="Engineering tools"><Link to="/legacy"><FlaskConical size={18}/><span>Analysis lab</span><ExternalLink size={13}/></Link><button onClick={() => setModelInfo(true)}><CircleHelp size={18}/><span>Model & methodology</span></button></nav>
      <div className="v-sidebar-bottom"><div className="v-environment"><span className="v-dot"/><b>PROTOTYPE ENVIRONMENT</b><p>Physics-informed intelligence.<br/>Mission-focused decisions.</p><span>SMART INDIA HACKATHON <ArrowUpRight size={13}/></span></div><div className="v-operator"><div className="v-avatar">GC</div><div><b>Ground control</b><small>Engineering station 01</small></div><Radio size={17}/></div></div>
    </aside>
    <div className="v-main">
      <header className="v-topbar"><div className="v-crumb"><button className="v-icon-button v-mobile-menu" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={20}/></button><span>Workspace</span><ChevronRight size={13}/><b>Engine operations</b></div><div className="v-top-actions"><span className={`v-link-state ${live ? 'connected' : ''}`}><span className="v-dot"/>{live ? 'Telemetry connected' : connection === 'offline' ? 'Link unavailable' : data?.quality.status === 'paused' ? 'Simulation paused' : 'Awaiting live state'}</span><span className="v-divider"/><button className="v-icon-button" aria-label="View maintenance alerts" onClick={() => navigate('maintenance')}><Bell size={18}/>{faults.length > 0 && <i className="v-alert-dot"/>}</button><div className="v-avatar small">GC</div></div></header>
      <main className="v-content" id="overview">
        <div className="v-page-heading"><div><div className="v-eyebrow"><span className="v-dot"/> PROPULSION HEALTH MANAGEMENT <span className="v-version">VERSION 2.0</span></div><h1>Mission overview<span>.</span></h1><p>A living view of your engine. Intelligence for every mission.</p></div><div className="command-actions"><button className="v-button primary" onClick={advanceDemo} disabled={!data || busy}><Play size={14}/> Demo Mode</button><button className="v-button" onClick={exportPdfReport} disabled={!data}><FileText size={15}/> PDF report</button><button className="v-icon-button" aria-label="Export JSON report" onClick={exportReport} disabled={!data}><Download size={15}/></button></div></div>
        {(error || fleetError || actionError) && <div className="v-alert" role="alert"><TriangleAlert size={18}/><span>{actionError || error || fleetError}</span><button aria-label="Dismiss action error" onClick={() => setActionError('')}><X size={15}/></button></div>}
        {notice && <div className="v-notice" role="status"><Check size={15}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14}/></button></div>}
        {!data ? <div className="v-loading"><div className="v-radar"><Radio size={30}/></div><h2>Establishing engine link</h2><p>Connecting to the V2 digital twin service…</p><span>Start the FastAPI backend on port 8000. The cockpit reconnects automatically.</span></div> : <>
          <div className="v-asset-bar"><div className="v-asset-icon"><Box size={23}/></div><div><b>VAYU-01 <Badge tone={data.source === 'simulation' ? 'purple' : 'green'}>{data.source === 'simulation' ? 'SIMULATED' : 'TELEMETRY'}</Badge></b><small>MALE UAV · Four-cylinder aero piston engine</small></div><div className="v-asset-stat"><span>MISSION DURATION</span><b>{data.mission.duration_hours} <small>hrs</small></b></div><div className="v-asset-stat"><span>AMBIENT</span><b>{data.controls.ambient_temperature} <small>°C</small></b></div><div className="v-asset-stat"><span>LAST SAMPLE · UTC</span><b>{timeLabel(data.timestamp)}</b></div><div className="v-scenario"><label htmlFor="scenario">DEMONSTRATION SCENARIO</label><select id="scenario" value={data.controls.scenario} disabled={busy || data.controls.source !== 'simulation'} onChange={e => control({ scenario: e.target.value })}>{Object.entries(scenarios).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div><button className="v-icon-button v-pause" aria-label={data.controls.running ? 'Pause simulation' : 'Resume simulation'} disabled={busy || data.controls.source !== 'simulation'} onClick={() => control({ running: !data.controls.running })}>{data.controls.running ? <Pause size={17}/> : <Play size={17}/>}</button></div>
          {!live && <div className="v-stale"><Clock3 size={15}/> {data.quality.status === 'paused' ? 'Simulation paused. All values are held at the last sample.' : 'These estimates describe the last received state. Awaiting fresh telemetry.'} Prediction support is unavailable while the feed is inactive.</div>}
          <section className="v-metrics" aria-label="Engine condition summary">
            <Metric icon={Activity} label="ENGINE HEALTH INDEX" value={fmt(data.health_index)} unit="/ 100" tone={data.health_index > 80 ? 'green' : 'amber'}><span className="v-health-track"><i style={{width: `${data.health_index}%`}}/></span><span>{data.health_index > 85 ? 'Healthy operating state' : data.health_index > 65 ? 'Degradation detected' : 'Inspection required'}</span></Metric>
            <Metric icon={Clock3} label="REMAINING USEFUL LIFE" value={fmt(data.rul.hours, 0)} unit="hrs" tone="blue" sub={`${fmt(data.rul.lower_hours, 0)}–${fmt(data.rul.upper_hours, 0)} hrs · sensitivity range`}/>
            <Metric icon={ShieldCheck} label="MISSION RELIABILITY" value={fmt(data.mission.reliability_percent)} unit="%" tone={decisionTone}><span className={`v-inline ${decisionTone}`}><span className="v-dot"/>{data.mission.decision === 'WITHIN DEMO ENVELOPE' ? 'Within demonstration envelope' : data.mission.decision.toLowerCase()}</span></Metric>
            <Metric icon={Sparkles} label="HYBRID MODEL CONFIDENCE" value={live ? fmt(data.hybrid?.confidence_percent ?? data.explainability.confidence_percent, 0) : '—'} unit={live ? '%' : ''} tone="purple" sub="Digital twin + condition surrogate"/>
          </section>
          <div className="phm-demo-grid">
            <FaultPropagation data={data}/>
            <section className="v-panel rul-countdown"><SectionHead title="Remaining useful life" eyebrow="DYNAMIC LIFE FORECAST" icon={Clock3}><Badge tone="blue">DECLINING</Badge></SectionHead><strong>{fmt(data.rul.hours, 0)}<small> flight hours</small></strong><div><span>Previous RUL <b>{fmt(data.rul.previous_hours, 1)} h</b></span><span>Delta <b>{fmt(data.rul.delta_hours, 2)} h</b></span><span>Prediction confidence <b>{fmt(data.explainability.confidence_percent, 0)}%</b></span></div><p>Wear, thermal stress and the active fault signature determine this countdown.</p></section>
            <section className="v-panel detection-confidence"><SectionHead title="Fault detection confidence" eyebrow="EVIDENCE ACCUMULATION" icon={Sparkles}><Badge tone="purple">{certaintyLabel(data.explainability.confidence_percent).toUpperCase()}</Badge></SectionHead><strong>{fmt(data.explainability.confidence_percent, 0)}<small>%</small></strong><div className="confidence-meter"><i style={{width: `${data.explainability.confidence_percent}%`}}/></div><p>Trend: increasing as residual evidence accumulates. Certainty: <b>{certaintyLabel(data.explainability.confidence_percent)}</b>.</p></section>
            <section className="v-panel performance-signature"><SectionHead title="Active fault signature" eyebrow="EXPLAINABLE PERFORMANCE EFFECTS" icon={Gauge}/><div><span>Pressure ratio <b>{fmt(data.performance.pressure_ratio, 2)}</b></span><span>Compressor efficiency <b>{fmt(data.performance.compressor_efficiency_percent, 0)}%</b></span><span>Fuel pressure <b>{fmt(data.performance.fuel_pressure_bar, 2)} bar</b></span><span>Range remaining <b>{fmt(data.performance.range_percent, 0)}%</b></span><span>Fuel anomaly <b>+{fmt(data.performance.fuel_consumption_anomaly_percent, 0)}%</b></span><span>Sensor bias <b>{fmt(data.performance.sensor_bias_magnitude, 2)}</b></span></div></section>
          </div>
          <Suspense fallback={<div className="v-panel visual-loading">Loading fleet operational picture…</div>}><FleetCommandCenter fleet={fleet}/></Suspense>
          <Suspense fallback={<div className="v-panel visual-loading">Loading mission visual systems…</div>}><MissionVisuals data={data} history={history} /></Suspense>
          <div className="v-primary-grid">
            <section className="v-panel v-twin-panel" id="digital-twin"><SectionHead title="Engine digital twin" eyebrow="PHYSICAL SYSTEM ↔ DIGITAL STATE" icon={Box}><Badge tone={live ? 'green' : 'amber'}><span className="v-dot"/>{live ? 'LIVE · 1 Hz' : data.quality.status.toUpperCase()}</Badge></SectionHead><EngineTwin sensors={data.sensors} running={live && (data.controls.source === "telemetry" || data.controls.running)} selected={selected} onSelect={setSelected}/></section>
            <section className="v-panel v-sensors"><SectionHead title="Live telemetry" eyebrow="SEVEN-CHANNEL SENSOR ARRAY"><Radio size={17}/></SectionHead><div className="v-sensor-list">{sensorOrder.map(key => { const item = features.find(feature => feature.key === key); const progress = Math.max(0, Math.min(100, (item.value - item.min) / (item.max - item.min) * 100)); return <button key={key} className={`v-sensor ${item.status} ${signal === key ? 'selected' : ''}`} onClick={() => { setSignal(key); if (key === 'cht') setSelected('cylinder'); if (key === 'egt') setSelected('exhaust'); if (key.startsWith('oil')) setSelected('oil'); if (key === 'vibration' || key === 'rpm') setSelected('shaft') }} aria-label={`View ${item.label} trend`}><div className="v-sensor-label"><span className="v-dot"/>{item.label}<small>{item.status === 'nominal' ? 'NORMAL' : item.status.toUpperCase()}</small></div><div className="v-sensor-reading"><strong>{fmt(item.value, key === 'rpm' ? 0 : key === 'oil_pressure' || key === 'vibration' ? 2 : 1)}<small>{item.unit}</small></strong><svg viewBox="0 0 94 26" aria-hidden="true"><path d={sparkline(history, key)} fill="none" stroke="currentColor" strokeWidth="1.4"/></svg></div><div className="v-sensor-track"><span style={{left:`${(item.normal_min-item.min)/(item.max-item.min)*100}%`,width:`${(item.normal_max-item.normal_min)/(item.max-item.min)*100}%`}}/><i style={{left:`${progress}%`}}/></div></button> })}</div><div className="v-panel-foot"><span>Marker = measured value</span><span><i className="v-mini-line"/> Normal envelope</span></div></section>
          </div>
          <div className="v-secondary-grid" id="prognostics">
            <section className="v-panel v-trend"><SectionHead title="Telemetry & twin response" eyebrow="OBSERVED VS EXPECTED"><select aria-label="Trend sensor" value={signal} onChange={e => setSignal(e.target.value)}>{sensorOrder.map(key => <option key={key} value={key}>{sensorNames[key]}</option>)}</select></SectionHead><div className="v-chart-meta"><div><span className="v-chart-value">{fmt(data.sensors[signal], signal === 'rpm' ? 0 : 1)}<small>{sensor?.unit}</small></span><span className="v-muted">{sensor?.label} · last {history.length} samples</span></div><div className="v-chart-legend"><span><i/>Observed</span><span><i className="dashed"/>Twin expected</span></div></div><div className="v-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top:12,right:12,left:-15,bottom:0}}><defs><linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#54dbbc" stopOpacity=".24"/><stop offset="1" stopColor="#54dbbc" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="#ffffff09"/><XAxis dataKey="time" tickFormatter={timeLabel} tick={{fill:'#70858f',fontSize:10}} minTickGap={45} axisLine={false} tickLine={false}/><YAxis domain={['auto','auto']} tick={{fill:'#70858f',fontSize:10}} tickFormatter={v => fmt(v,0)} axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltipStyle} labelFormatter={timeLabel} formatter={(value,name) => [`${fmt(value)} ${sensor?.unit}`,name === 'observed' ? 'Observed' : 'Twin expected']}/><Area type="monotone" dataKey="observed" stroke="#54dbbc" strokeWidth={2} fill="url(#trendGradient)" isAnimationActive={false}/><Area type="monotone" dataKey="expected" stroke="#8794b9" strokeWidth={1.5} strokeDasharray="5 5" fill="none" isAnimationActive={false}/></AreaChart></ResponsiveContainer></div><div className="v-panel-foot"><span><span className="v-dot"/> {connection === 'streaming' ? 'WebSocket stream' : 'HTTP fallback'} · UTC</span><span>Rolling window · 180 samples</span></div></section>
            <section className="v-panel v-life"><SectionHead title="Life consumption" eyebrow="WEAR-BASED PROGNOSTICS" icon={Clock3}/><div className="v-life-ring" style={{'--wear': `${data.wear_percent}%`}}><div><span>{fmt(data.wear_percent)}<small>%</small></span><p>WEAR BUDGET USED</p></div></div><div className="v-life-stats"><div><span>Estimated time remaining</span><b>{fmt(data.rul.hours,0)} <small>hrs</small></b></div><div><span>Assumed sensitivity band</span><b>{fmt(data.rul.lower_hours,0)}–{fmt(data.rul.upper_hours,0)} <small>hrs</small></b></div></div><p className="v-model-note">Load, thermal stress, lubrication and vibration drive accumulated wear. Constant future conditions assumed.</p></section>
          </div>
          <div className="v-section-heading"><div><span className="v-eyebrow">FROM OBSERVATION TO ACTION</span><h2>Understand. Predict. Prepare.</h2></div><span>Explainable decisions at every step <ArrowDownRight size={17}/></span></div>
          <div className="v-intelligence-grid">
            <section className="v-panel v-explain"><SectionHead title="Explainable intelligence" eyebrow="WHY THE MODEL THINKS THIS" icon={Sparkles}><Badge tone="purple">PHYSICS + RULES</Badge></SectionHead><div className="v-confidence"><div><span>Prediction confidence</span><small>Heuristic support · not a fault probability</small></div><b>{live ? fmt(data.explainability.confidence_percent,0) + '%' : '—'}</b></div><div className="v-feature-title"><b>Feature importance</b><span>Share of sensor health penalty</span></div><div className="v-feature-list">{features.map(item => <div key={item.key} className="v-feature"><span>{item.label}</span><div><i style={{width: `${item.importance}%`}}/></div><b>{fmt(item.importance,0)}%</b></div>)}</div>{data.explainability.health_penalty === 0 && <p className="v-muted">No sensor contributes a health penalty at this operating point.</p>}<div className="v-reasoning"><span><Sparkles size={14}/> FAULT REASONING</span>{data.explainability.reasoning.map(reason => <p key={reason}>{reason}</p>)}</div><div className="v-panel-foot"><span>Health deductions: sensors {fmt(data.explainability.health_penalty)} + wear {fmt(data.explainability.wear_penalty)}</span><button onClick={() => setModelInfo(true)}>Methodology <ArrowUpRight size={13}/></button></div></section>
            <section className="v-panel v-mission" id="mission"><SectionHead title="Mission reliability" eyebrow="PLAN WITH ENGINE CONDITION" icon={Target}/><div className={`v-mission-result ${decisionTone}`}><div><span>Estimated mission survival</span><strong>{fmt(data.mission.reliability_percent)}<small>%</small></strong></div><ShieldCheck size={45}/><Badge tone={decisionTone}>{data.mission.decision}</Badge></div><Slider label="Mission duration" value={mission.duration_hours} min={.5} max={24} step={.5} unit=" h" onChange={value => setMissionDraft({...mission,duration_hours:value})}/><Slider label="Environmental severity" value={Math.round(mission.environmental_severity*100)} min={0} max={100} unit="%" onChange={value => setMissionDraft({...mission,environmental_severity:value/100})}/><div className="v-severity-scale"><span>Benign</span><span>Harsh conditions</span></div><div className="v-mission-factors"><span>Engine health <b>{fmt(data.health_index)} / 100</b></span><span>Applied duration <b>{data.mission.duration_hours} hours</b></span></div><button className="v-button primary full" disabled={busy || !draftChanged} onClick={() => control({mission}).then(saved => { if (saved) setMissionDraft(null) })}><ShieldCheck size={15}/>{busy ? 'Calculating…' : 'Update mission assessment'}</button><p className="v-model-note">Exponential survival estimate, conditioned on health, RUL and environment. Decision aid for this demonstration.</p></section>
          </div>
          <section className="v-panel hybrid-assurance"><SectionHead title="Physics + AI hybrid assurance" eyebrow="MODEL AGREEMENT / SENSOR-TO-TWIN RECONCILIATION" icon={Sparkles}><Badge tone={data.hybrid?.agreement_percent >= 85 ? 'green' : 'amber'}>{fmt(data.hybrid?.agreement_percent ?? 0, 0)}% AGREEMENT</Badge></SectionHead><div className="hybrid-grid"><div><span>Digital twin assessment</span><b>{fmt(data.hybrid?.physics_health ?? data.health_index)}<small>/100</small></b></div><div><span>Condition surrogate</span><b>{fmt(data.hybrid?.ai_health ?? data.health_index)}<small>/100</small></b></div><div><span>Fused health</span><b>{fmt(data.hybrid?.fused_health ?? data.health_index)}<small>/100</small></b></div><p><Sparkles size={15}/>{data.hybrid?.reason || 'Awaiting hybrid model assessment.'}<small>{data.hybrid?.method}</small></p></div></section>
          <section className="v-panel v-whatif" id="simulation"><SectionHead title="What-if simulation" eyebrow="EXPLORE THE NEXT OPERATING POINT" icon={SlidersHorizontal}><Badge tone="blue">ISOLATED FORECAST</Badge></SectionHead><div className="v-whatif-grid"><div className="v-whatif-controls"><p className="v-muted">Adjust operating conditions and compare both futures over the same forecast horizon.</p>{[['rpm_adjustment','RPM adjustment',-1500,1000,50,' rpm'],['temperature_variation','Ambient temperature variation',-20,30,1,' °C'],['fuel_flow_variation','Fuel flow variation',-30,30,1,'%']].map(([key,label,min,max,step,unit]) => <Slider key={key} label={label} value={whatIf[key]} min={min} max={max} step={step} unit={unit} signed onChange={value => {setWhatIf({...whatIf,[key]:value});setForecast(null)}}/>)}<label className="v-horizon">Forecast horizon<select value={whatIf.horizon_minutes} onChange={e => {setWhatIf({...whatIf,horizon_minutes:Number(e.target.value)});setForecast(null)}}><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label><button className="v-button primary full" onClick={simulate} disabled={forecastBusy || !live}><Play size={15}/>{forecastBusy ? 'Simulating both futures…' : 'Run what-if simulation'}<ArrowRight size={15}/></button></div><div className="v-whatif-results">{forecast ? <><div className="v-delta-grid">{[['reliability_points','Reliability impact','pp'],['rul_hours','RUL impact','hrs']].map(([key,label,unit]) => <div key={key}><span>{label}</span><b className={forecast.delta[key] >= 0 ? 'green' : 'amber'}>{forecast.delta[key] > 0 ? '+' : ''}{fmt(forecast.delta[key])}<small>{unit}</small></b><small>Compared with unchanged operation</small></div>)}</div><div className="v-chart-legend"><span><i/>Adjusted operation</span><span><i className="dashed"/>Baseline operation</span></div><div className="v-chart forecast"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecast.trajectory} margin={{top:15,right:15,left:-10,bottom:0}}><CartesianGrid vertical={false} stroke="#ffffff0a"/><XAxis dataKey="minutes" unit="m" tick={{fill:'#70858f',fontSize:10}} tickLine={false} axisLine={false}/><YAxis domain={['auto','auto']} unit="%" tick={{fill:'#70858f',fontSize:10}} tickLine={false} axisLine={false}/><Tooltip contentStyle={tooltipStyle} labelFormatter={v => `${v} min`} formatter={(v,n) => [`${fmt(v,2)}%`,n === 'candidate_reliability' ? 'Adjusted' : 'Baseline']}/><Line type="monotone" dataKey="candidate_reliability" stroke="#54dbbc" dot={false} strokeWidth={2} isAnimationActive={false}/><Line type="monotone" dataKey="baseline_reliability" stroke="#9292bd" strokeDasharray="5 5" dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div><p className="v-model-note">Snapshot #{forecast.baseline_sequence} · {forecast.request.horizon_minutes}-minute forecast · target {fmt(forecast.effective_controls.rpm_target,0)} rpm / {forecast.effective_controls.ambient_temperature} °C / {fmt(forecast.effective_controls.fuel_flow_multiplier*100,0)}% fuel. Adjustments are bounded by the model envelope.</p><div className="v-forecast-outcome"><span>Forecast reliability <b>{fmt(forecast.candidate.mission.reliability_percent)}%</b></span><span>Forecast RUL <b>{fmt(forecast.candidate.rul.hours,0)} hrs</b></span></div></> : <div className="v-forecast-empty"><div><FlaskConical size={29}/></div><Badge tone="blue">COUNTERFACTUAL ENGINE</Badge><h3>One engine. Two possible futures.</h3><p>See how a change in power, temperature or fuel flow affects mission reliability and remaining life.</p><div className="v-empty-comparison"><span>Current operation</span><ArrowRight size={20}/><span>Adjusted operation</span></div><small>Live engine state is preserved during every simulation.</small></div>}</div></div></section>
          <section className="v-panel v-maintenance" id="maintenance"><SectionHead title="Maintenance recommendations" eyebrow="CONDITION-BASED ENGINEERING ACTIONS" icon={Wrench}><Badge tone={faults.length ? 'amber' : 'green'}>{faults.length ? `${faults.length} ACTIVE FINDING${faults.length>1?'S':''}` : 'NO ACTIVE FAULTS'}</Badge></SectionHead><div className="v-table-wrap"><table><thead><tr><th>FAILURE MODE</th><th>RECOMMENDED ACTION</th><th>PRIORITY</th><th>EST. TIME</th><th><span className="v-sr-only">Details</span></th></tr></thead><tbody>{data.maintenance.map(item => <tr key={item.id}><td><div className={`v-maint-mode ${item.priority}`}><span>{item.priority === 'routine' ? <Check size={17}/> : <TriangleAlert size={17}/>}</span><b>{item.failure_mode}</b></div></td><td><p>{item.recommended_action}</p>{expanded === item.id && <div className="v-maint-reason">{item.reason} {item.features.length > 0 && `Supporting channels: ${item.features.map(key => sensorNames[key]).join(', ')}.`}</div>}</td><td><Badge tone={item.priority === 'critical' ? 'red' : item.priority === 'high' ? 'amber' : 'blue'}>{item.priority.toUpperCase()}</Badge></td><td><span className="v-maint-time"><Clock3 size={14}/>{item.estimated_hours} hrs</span></td><td><button className="v-icon-button" aria-label={`Details for ${item.failure_mode}`} aria-expanded={expanded === item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}><ChevronDown size={17}/></button></td></tr>)}</tbody></table></div><div className="v-panel-foot"><span>Actions and labor estimates are illustrative; use the engine maintenance manual for actual work.</span><Link to="/diagnosis">Open diagnostic lab <ArrowUpRight size={13}/></Link></div></section>
          <div className="v-source-controls"><div><Settings2 size={16}/><span>Data acquisition</span></div><label>Source<select aria-label="Telemetry source" disabled={busy} value={data.controls.source} onChange={e => control({source:e.target.value})}><option value="simulation">Built-in engine simulator</option><option value="telemetry">External telemetry ingestion</option></select></label><span>{data.controls.source === 'telemetry' ? 'Ingest seven-channel samples through POST /api/v2/telemetry.' : 'Deterministic 1 Hz simulation · fault scenarios enabled'}</span></div>
          <footer className="v-footer"><span><Wind size={16}/> SKYNEX <b>/</b> SIH26054</span><p>Research prototype · Synthetic engine profile · Not flight clearance</p><button className={presentation ? 'presentation-on' : ''} onClick={() => setPresentation(value => !value)}>{presentation ? 'Stop presentation sequence' : 'Start judge presentation'} <Play size={13}/></button><button onClick={() => setModelInfo(true)}>Model {data.model_version} <ArrowUpRight size={13}/></button></footer>
        </>}
      </main>
    </div>
    {modelInfo && <div className="v-modal-backdrop" onClick={() => setModelInfo(false)}><section className="v-modal" role="dialog" aria-modal="true" aria-labelledby="model-title" onClick={e => e.stopPropagation()} onKeyDown={e => {if(e.key === 'Escape')setModelInfo(false)}}><button autoFocus className="v-icon-button v-modal-close" aria-label="Close methodology" onClick={() => setModelInfo(false)}><X size={20}/></button><Badge tone="purple">MODEL TRANSPARENCY</Badge><h2 id="model-title">Intelligence you can inspect.</h2><p>SKYNEX V2 combines a seven-state reduced-order engine model with residual analysis, wear integration and explicit fault rules. It is a physics-informed demonstrator, with no trained machine-learning weights.</p><dl><dt>Health index</dt><dd>100 minus weighted sensor deviation penalties and a wear penalty. All contributions are visible in the explainability panel.</dd><dt>Remaining useful life</dt><dd>Remaining wear budget divided by current wear rate. Assumed baseline life is 800 hours; the engine starts with 18% consumed. The ±35% band is a sensitivity assumption.</dd><dt>Mission reliability</dt><dd>100 × exp(−hazard × mission hours). Hazard depends on health, remaining life and environmental severity.</dd><dt>Prediction confidence</dt><dd>A heuristic based on sample support and out-of-envelope measurements. It is not a calibrated probability or measured accuracy.</dd><dt>What-if forecasts</dt><dd>Two independent model copies evolve over an identical horizon. The selected fault scenario stays fixed. External faults are not automatically inferred for propagation.</dd></dl><p className="v-model-note">OEM maps, bench testing, fault-labeled flight data and calibrated uncertainty are required before operational use. The legacy lab retains its original demonstration validation metrics.</p><button className="v-button primary" onClick={() => setModelInfo(false)}>Understood <Check size={15}/></button></section></div>}
  </div>
}
