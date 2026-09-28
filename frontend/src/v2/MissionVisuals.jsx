import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Activity, AlertTriangle, Pause, Play, RotateCcw, Satellite, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { AdvancedAnalytics, ExplainabilityCenter, MaintenanceRecommendations, MissionTimeline } from './CommandCenterPanels'

function UavModel({ health }) {
  const healthy = health >= 80
  const accent = healthy ? '#63ddbc' : '#e9b969'
  const propeller = useRef()
  useFrame((_, delta) => {
    if (propeller.current) propeller.current.rotation.y += delta * 2.2
  })
  return (
    <group rotation={[0.12, 0, -0.08]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 3.2, 8, 24]} />
        <meshStandardMaterial color="#243842" metalness={0.8} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.15, 0.38]}>
        <sphereGeometry args={[0.32, 20, 12]} />
        <meshStandardMaterial color="#8aa8b0" metalness={0.55} roughness={0.2} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.05, -0.05, 0]} rotation={[0, 0, side * 0.08]}>
          <mesh>
            <boxGeometry args={[1.8, 0.08, 0.62]} />
            <meshStandardMaterial color="#314a54" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[side * 0.7, 0.02, 0]}>
            <boxGeometry args={[0.08, 0.05, 0.42]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, -1.75]}>
        <boxGeometry args={[0.12, 0.65, 0.8]} />
        <meshStandardMaterial color="#415c65" metalness={0.65} roughness={0.35} />
      </mesh>
      <group ref={propeller} position={[0, 0, 1.72]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.06, 2.1, 0.05]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <boxGeometry args={[0.06, 2.1, 0.05]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  )
}

export function Uav3D({ health = 100 }) {
  return (
    <div className="uav-viewport" aria-label="Interactive 3D MALE UAV visualization">
      <Canvas camera={{ position: [4.2, 2.7, 5.8], fov: 38 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#0b151b']} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[4, 5, 4]} intensity={2.2} color="#b9fff0" />
        <pointLight position={[-3, 1, 2]} intensity={10} distance={8} color="#63ddbc" />
        <Suspense fallback={null}><UavModel health={health} /></Suspense>
        <OrbitControls enablePan={false} minDistance={4} maxDistance={8} />
      </Canvas>
      <span className="uav-overlay-label"><Satellite size={13} /> VAYU-01 / DIGITAL AIRFRAME</span>
      <span className="uav-overlay-hint">DRAG TO INSPECT · SCROLL TO ZOOM</span>
    </div>
  )
}

export function AnimatedGauge({ value, label, unit = '%', tone = 'green', displayValue }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={`animated-gauge ${tone}`} role="img" aria-label={`${label}: ${safeValue}${unit}`}>
      <svg viewBox="0 0 120 120">
        <circle className="gauge-track" cx="60" cy="60" r="48" />
        <motion.circle className="gauge-value" cx="60" cy="60" r="48" pathLength="100" initial={{ strokeDasharray: '0 100' }} animate={{ strokeDasharray: `${safeValue} 100` }} transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <strong>{displayValue ?? safeValue.toFixed(0)}<small>{unit}</small></strong>
      <span>{label}</span>
    </div>
  )
}

function severityFor(row) {
  if (row.health_index < 65) return 'critical'
  if (row.health_index < 80) return 'warning'
  return 'nominal'
}

export function FaultTimeline({ history }) {
  const events = useMemo(() => history.slice(-12).map((row) => ({ ...row, severity: severityFor(row) })), [history])
  return (
    <section className="v-panel fault-timeline-panel" id="fault-timeline">
      <div className="v-panel-head"><div><span className="v-eyebrow">EVENT CORRELATION / HEALTH HISTORY</span><h3><AlertTriangle size={16} /> Fault timeline</h3></div><span className="v-muted">LAST {events.length} SAMPLES</span></div>
      <div className="fault-timeline" aria-label="Fault timeline">
        {events.length ? events.map((event, index) => <motion.div key={event.sequence || index} className={`fault-event ${event.severity}`} initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * .04 }} title={new Date(event.timestamp).toISOString()}><span /><b>{event.severity === 'nominal' ? 'NOMINAL' : event.severity.toUpperCase()}</b><small>{new Date(event.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</small></motion.div>) : <p className="v-muted">Awaiting sufficient history for fault correlation.</p>}
      </div>
      <div className="fault-legend"><span><i className="nominal" /> Nominal</span><span><i className="warning" /> Monitor</span><span><i className="critical" /> Action required</span></div>
    </section>
  )
}

export function MissionReplayPlayer({ history }) {
  const [index, setIndex] = useState(Math.max(0, history.length - 1))
  const [playing, setPlaying] = useState(false)
  useEffect(() => setIndex(Math.max(0, history.length - 1)), [history.length])
  useEffect(() => {
    if (!playing || index >= history.length - 1) { if (index >= history.length - 1) setPlaying(false); return undefined }
    const timer = setTimeout(() => setIndex((value) => value + 1), 700)
    return () => clearTimeout(timer)
  }, [playing, index, history.length])
  const frame = history[index]
  return (
    <section className="v-panel mission-replay-panel" id="mission-replay">
      <div className="v-panel-head"><div><span className="v-eyebrow">MISSION DATA RECORDER</span><h3><Activity size={16} /> Mission replay player</h3></div><span className="v-badge blue">FRAME {history.length ? `${index + 1}/${history.length}` : '—'}</span></div>
      {frame ? <><div className="replay-frame"><AnimatedGauge value={frame.health_index} label="HEALTH" /><div className="replay-readouts"><span>UTC TIME <b>{new Date(frame.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</b></span><span>RUL <b>{Number(frame.rul_hours).toFixed(0)} hrs</b></span><span>RELIABILITY <b>{Number(frame.reliability_percent).toFixed(1)}%</b></span></div></div><input aria-label="Mission replay frame" className="v-replay-range" type="range" min="0" max={Math.max(0, history.length - 1)} value={index} onChange={(event) => { setPlaying(false); setIndex(Number(event.target.value)) }} /><div className="replay-actions"><button className="v-button primary" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause replay' : 'Play replay'}</button><button className="v-button" onClick={() => { setPlaying(false); setIndex(0) }}><RotateCcw size={14} /> Reset</button><span className="v-muted">Deterministic playback from the twin history buffer</span></div></> : <p className="v-muted">Replay becomes available when telemetry history is received.</p>}
    </section>
  )
}

export function MissionVisuals({ data, history }) {
  const sensorGauge = (key, label, max, tone = 'green') => (
    <AnimatedGauge value={(Number(data.sensors[key]) / max) * 100} displayValue={Number(data.sensors[key]).toFixed(key === 'rpm' ? 0 : 1)} label={label} unit={data.explainability.features.find((item) => item.key === key)?.unit || ''} tone={tone} />
  )
  const risk = Math.max(0, 100 - Number(data.mission.reliability_percent))
  const activeFault = data.explainability.reasoning?.[0] || 'No active fault signature detected.'
  const missionAction = data.mission.decision === 'WITHIN DEMO ENVELOPE' ? 'Continue mission' : data.mission.decision
  return <div className="mission-visuals" id="mission-control">
    <section className="v-panel uav-panel">
      <div className="v-panel-head"><div><span className="v-eyebrow">MISSION CONTROL / AIR VEHICLE STATE</span><h3><ShieldCheck size={16} /> Air vehicle overview</h3></div><span className="v-badge green">3D DIGITAL AIRFRAME</span></div>
      <Uav3D health={data.health_index} />
      <div className="uav-gauges"><AnimatedGauge value={data.health_index} label="Health" /><AnimatedGauge value={data.mission.reliability_percent} label="Reliability" tone="blue" /><AnimatedGauge value={100 - data.wear_percent} label="Life reserve" tone="purple" /></div>
      <div className="sensor-gauges"><div className="v-panel-head"><div><span className="v-eyebrow">LIVE SENSOR ARRAY</span><h3><Activity size={16} /> Propulsion telemetry</h3></div><span className="v-muted">AUTO-UPDATED</span></div><div className="sensor-gauge-grid">{sensorGauge('rpm', 'RPM', 6000)}{sensorGauge('egt', 'EGT', 900, 'amber')}{sensorGauge('vibration', 'Vibration', 10, 'purple')}{sensorGauge('fuel_flow', 'Fuel', 40, 'blue')}</div></div>
    </section>
    <section className="v-panel mission-status-panel">
      <div className="v-panel-head"><div><span className="v-eyebrow">MISSION STATUS / DECISION SUPPORT</span><h3><ShieldCheck size={16} /> Mission readiness</h3></div><span className={`v-badge ${risk > 35 ? 'amber' : 'green'}`}>{risk > 35 ? 'MONITOR' : 'NOMINAL'}</span></div>
      <div className="mission-status-grid"><div><span>MISSION STATE</span><b>{data.controls.running ? 'ACTIVE / MONITORING' : 'STANDBY / HOLD'}</b></div><div><span>RISK LEVEL</span><b>{risk.toFixed(1)}%</b></div><div><span>RECOMMENDED ACTION</span><b>{missionAction}</b></div><div><span>REMAINING CAPABILITY</span><b>{Number(data.rul.hours).toFixed(0)} hrs projected</b></div></div>
    </section>
    <section className="v-panel fault-center-panel">
      <div className="v-panel-head"><div><span className="v-eyebrow">FAULT DETECTION CENTER / RESIDUAL ANALYSIS</span><h3><AlertTriangle size={16} /> Active fault assessment</h3></div><span className={`v-badge ${data.health_index < 80 ? 'amber' : 'green'}`}>{data.health_index < 80 ? 'ATTENTION' : 'CLEAR'}</span></div>
      <div className="fault-center"><div className="fault-confidence"><AnimatedGauge value={data.explainability.confidence_percent} label="Confidence" tone="amber" /></div><div className="fault-summary"><span>ACTIVE FAULT SIGNATURE</span><strong>{activeFault}</strong><span>FAULT CONFIDENCE</span><b>{Number(data.explainability.confidence_percent).toFixed(0)}%</b><span>RESIDUAL TREND</span><div className="residual-bars">{data.explainability.features.slice(0, 4).map((item) => <i key={item.key} style={{ height: `${Math.max(8, Math.min(100, item.importance))}%` }} title={`${item.label}: ${item.importance.toFixed(1)}%`} />)}</div></div></div>
    </section>
    <FaultTimeline history={history} /><MissionReplayPlayer history={history} />
    <ExplainabilityCenter data={data} /><MaintenanceRecommendations data={data} /><MissionTimeline data={data} history={history} /><AdvancedAnalytics data={data} history={history} />
  </div>
}
