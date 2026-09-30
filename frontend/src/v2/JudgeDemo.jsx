import { AlertTriangle, CheckCircle2, Clock3, Pause, Play, RotateCcw, ShieldCheck, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'

const scenarios = [
  ['nominal', 'Healthy Engine'], ['engine_degradation', 'Engine Degradation'], ['compressor_fouling', 'Compressor Fouling'],
  ['fuel_leak', 'Fuel Leak'], ['sensor_bias', 'Sensor Bias'],
]
const stages = [
  ['Healthy', () => true], ['Early anomaly', p => p.detected], ['Fault detected', p => p.anomaly_detected],
  ['Health degradation', p => p.anomaly_detected], ['RUL reduction', p => p.root_cause_identified], ['Maintenance recommendation', p => p.maintenance_ready],
]
const confidenceLabel = value => value >= 85 ? 'High' : value >= 70 ? 'Medium' : 'Low'

export default function JudgeDemo({ data, busy, onStart, onPause }) {
  const progress = data.fault_progress
  const activeScenario = data.controls.scenario
  const finding = data.maintenance.find(item => item.priority !== 'routine') || data.maintenance[0]
  const isRunning = data.controls.running
  return <section className="judge-demo v-panel" aria-label="Judge demo mode">
    <div className="judge-demo-head"><div><span className="v-eyebrow">60-SECOND JUDGE WALKTHROUGH / DETERMINISTIC TWIN</span><h2>Judge Demo Mode</h2><p>Reset to a verified healthy baseline, then watch a real fault signature produce evidence, diagnosis and action.</p></div><span className="v-badge purple">LIVE TWIN</span></div>
    <div className="judge-scenario-selector" aria-label="Judge demo scenario selector">{scenarios.map(([id, label]) => <button key={id} className={activeScenario === id ? 'selected' : ''} disabled={busy} onClick={() => onStart(id)}>{label}</button>)}</div>
    <div className="judge-demo-body"><div className="judge-stages">{stages.map(([label, done], index) => { const active = done(progress); return <motion.div key={label} className={active ? 'complete' : ''} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }}><i>{active ? <CheckCircle2 size={13}/> : index + 1}</i><span>STAGE {index + 1}</span><b>{label}</b></motion.div> })}</div><div className="judge-evidence"><span>LIVE EVIDENCE</span><div><b>{progress.detected ? 'Evidence detected' : 'Awaiting deviation'}</b><small>Residual growth: {progress.severity_percent.toFixed(0)}%</small></div><div><b>Confidence {data.explainability.confidence_percent.toFixed(0)}% · {confidenceLabel(data.explainability.confidence_percent)}</b><small>RUL {data.rul.hours.toFixed(0)} h · health {data.health_index.toFixed(0)}%</small></div></div><aside className={`judge-summary ${finding?.priority || 'routine'}`}><span>JUDGE SUMMARY</span><b>{scenarios.find(([id]) => id === activeScenario)?.[1]}</b><dl><div><dt>Confidence</dt><dd>{data.explainability.confidence_percent.toFixed(0)}%</dd></div><div><dt>Health</dt><dd>{data.health_index.toFixed(0)}%</dd></div><div><dt>RUL</dt><dd>{data.rul.hours.toFixed(0)} h</dd></div></dl><p><Wrench size={14}/>{finding?.recommended_action || 'Continue scheduled inspection.'}</p></aside></div>
    <div className="judge-demo-controls"><button className="v-button primary" disabled={busy} onClick={() => onPause(!isRunning)}>{isRunning ? <Pause size={15}/> : <Play size={15}/>}{isRunning ? 'Pause' : 'Play'}</button><button className="v-button" disabled={busy} onClick={() => onStart(activeScenario)}><RotateCcw size={15}/> Restart</button><span><AlertTriangle size={14}/> {activeScenario === 'nominal' ? 'Select a fault scenario to begin the evidence sequence.' : `Stage progression: ${progress.elapsed_seconds.toFixed(0)} seconds of deterministic fault exposure.`}</span></div>
  </section>
