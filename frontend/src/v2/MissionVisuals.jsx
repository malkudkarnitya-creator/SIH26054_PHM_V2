import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Activity, AlertTriangle, Pause, Play, RotateCcw, Satellite, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

function UavModel({ health }) {
  const healthy = health >= 80
  const accent = healthy ? '#63ddbc' : '#e9b969'
  const [spin, setSpin] = useState(0)
  useFrame((_, delta) => setSpin((value) => value + delta * 2.2))
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
      <group rotation={[0, spin, 0]} position={[0, 0, 1.72]}>
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

export function AnimatedGauge({ value, label, unit = '%', tone = 'green' }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={`animated-gauge ${tone}`} role="img" aria-label={`${label}: ${safeValue}${unit}`}>
      <svg viewBox="0 0 120 120">
        <circle className="gauge-track" cx="60" cy="60" r="48" />
        <motion.circle className="gauge-value" cx="60" cy="60" r="48" pathLength="100" initial={{ strokeDasharray: '0 100' }} animate={{ strokeDasharray: `${safeValue} 100` }} transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <strong>{safeValue.toFixed(0)}<small>{unit}</small></strong>
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
  return <div className="mission-visuals" id="mission-control"><section className="v-panel uav-panel"><div className="v-panel-head"><div><span className="v-eyebrow">MISSION CONTROL / AIR VEHICLE STATE</span><h3><ShieldCheck size={16} /> Air vehicle overview</h3></div><span className="v-badge green">3D DIGITAL AIRFRAME</span></div><Uav3D health={data.health_index} /><div className="uav-gauges"><AnimatedGauge value={data.health_index} label="Health" /><AnimatedGauge value={data.mission.reliability_percent} label="Reliability" tone="blue" /><AnimatedGauge value={100 - data.wear_percent} label="Life reserve" tone="purple" /></div></section><FaultTimeline history={history} /><MissionReplayPlayer history={history} /></div>
}
