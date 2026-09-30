import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Cpu,
  Droplets,
  Flame,
  Gauge,
  Info,
  Layers,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  Wrench,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const scenarios = [
  {
    id: 'nominal',
    label: 'Healthy Engine',
    code: 'BASE-00',
    category: 'BASELINE',
    subtitle: 'Nominal Thermodynamic Balance',
    description: 'All 7 engine telemetry channels operate strictly within nominal design envelopes. Zero residual accumulation.',
    icon: ShieldCheck,
    tone: 'green',
    channels: ['RPM: 5200', 'EGT: 607°C', 'Vib: 1.7 mm/s'],
  },
  {
    id: 'engine_degradation',
    label: 'Engine Degradation',
    code: 'DEG-01',
    category: 'ROTATING ASSEMBLY',
    subtitle: 'Journal Bearing Wear & Imbalance',
    description: 'Progressive bearing wear generates mechanical friction, escalating vibration, elevated fuel burn, and thermal rise.',
    icon: Activity,
    tone: 'amber',
    channels: ['Vibration ↑ +7.0 mm/s', 'Fuel Flow ↑ +18%', 'EGT ↑ +72°C', 'Oil T ↑ +18°C'],
  },
  {
    id: 'compressor_fouling',
    label: 'Compressor Fouling',
    code: 'FOU-02',
    category: 'AERODYNAMIC',
    subtitle: 'Blading Contaminant Deposition',
    description: 'Aerodynamic blading fouling reduces stage pressure ratio and efficiency, demanding higher fuel burn at fixed thrust.',
    icon: Flame,
    tone: 'amber',
    channels: ['Fuel Flow ↑ +24%', 'EGT ↑ +55°C', 'Pressure Ratio ↓ -1.75'],
  },
  {
    id: 'fuel_leak',
    label: 'Fuel Leak',
    code: 'LEK-03',
    category: 'STARVATION',
    subtitle: 'High-Pressure Supply Line Rupture',
    description: 'Delivery pressure decay induces acute fuel flow loss, lean combustion overheating, and impending engine starvation.',
    icon: Droplets,
    tone: 'red',
    channels: ['Fuel Flow ↓ -38%', 'Oil Press ↓ -0.55 bar', 'EGT ↑ +45°C'],
  },
  {
    id: 'sensor_bias',
    label: 'Sensor Bias',
    code: 'SEN-04',
    category: 'INSTRUMENTATION',
    subtitle: 'Transducer Calibration Drift',
    description: 'Thermocouple & transducer calibration drift generates phantom residuals while actual engine core operates nominally.',
    icon: Sliders,
    tone: 'purple',
    channels: ['EGT Res ↑ +62°C', 'Oil P Res ↓ -0.75 bar', 'Physical: Nominal'],
  },
]

const stageDefinitions = [
  {
    stage: 1,
    title: 'Stage 1 — Healthy',
    shortTitle: 'Healthy Engine',
    condition: () => true,
    triggerDesc: 'Baseline nominal envelope; residuals < ±0.12σ',
    physicsNote: 'Baseline operational equilibrium across all 7 flight channels. Zero wear penalty.',
  },
  {
    stage: 2,
    title: 'Stage 2 — Early Anomaly',
    shortTitle: 'Early Anomaly',
    condition: p => p.detected || p.severity_percent >= 12,
    triggerDesc: 'Residual drift exceeds 0.12σ noise tolerance',
    physicsNote: 'Thermal or dynamic residuals cross statistical filter threshold; physical deviation begins.',
  },
  {
    stage: 3,
    title: 'Stage 3 — Fault Detection',
    shortTitle: 'Fault Detection',
    condition: p => p.anomaly_detected || p.severity_percent >= 30,
    triggerDesc: 'Multi-sensor residual divergence exceeds 0.8σ',
    physicsNote: 'Multi-channel signature correlation verifies anomaly isn’t transient noise; classifier triggers.',
  },
  {
    stage: 4,
    title: 'Stage 4 — Health Degradation',
    shortTitle: 'Health Degradation',
    condition: (p, data) => (data?.health_index < 95) || p.severity_percent >= 35,
    triggerDesc: 'Aggregated penalties lower Health Score < 95%',
    physicsNote: 'Normalized sensor deviations and cumulative wear reduce the composite 0-100 Health Score.',
  },
  {
    stage: 5,
    title: 'Stage 5 — RUL Reduction',
    shortTitle: 'RUL Reduction',
    condition: p => p.root_cause_identified || p.severity_percent >= 48,
    triggerDesc: 'Damage accumulation rate accelerates > 2.5× baseline',
    physicsNote: 'Instantaneous damage rate extrapolates wear envelope to predict accelerated remaining flight hours.',
  },
  {
    stage: 6,
    title: 'Stage 6 — Maintenance Recommendation',
    shortTitle: 'Maintenance Recommendation',
    condition: p => p.maintenance_ready || p.severity_percent >= 65,
    triggerDesc: 'Prescriptive rule triggers priority maintenance order',
    physicsNote: 'Actionable maintenance directive, component isolation, and flight clearance constraints generated.',
  },
]

const confidenceLabel = value => (value >= 85 ? 'High' : value >= 70 ? 'Medium' : 'Low')

export default function JudgeDemo({ data, busy, onStart, onPause, onRestart }) {
  const [selectedNarrativeStep, setSelectedNarrativeStep] = useState(null)

  const progress = data?.fault_progress || {
    scenario: 'nominal',
    elapsed_seconds: 0,
    severity_percent: 0,
    detected: false,
    anomaly_detected: false,
    root_cause_identified: false,
    maintenance_ready: false,
  }

  const activeScenario = data?.controls?.scenario || 'nominal'
  const isRunning = Boolean(data?.controls?.running)
  const finding = data?.maintenance?.find(item => item.priority !== 'routine') || data?.maintenance?.[0]
  const currentScenarioMeta = scenarios.find(s => s.id === activeScenario) || scenarios[0]

  // Calculate current active stage (1 to 6)
  let currentStageIndex = 1
  for (let i = stageDefinitions.length - 1; i >= 0; i--) {
    if (stageDefinitions[i].condition(progress, data)) {
      currentStageIndex = i + 1
      break
    }
  }

  // Find top residual feature for display
  const topFeature = data?.explainability?.features?.[0]

  // Narrative steps
  const narrativeSteps = [
    {
      step: 1,
      title: 'Telemetry',
      badge: 'INGESTION',
      icon: Radio,
      desc: 'Raw 7-channel multi-sensor acquisition (RPM, EGT, CHT, Fuel, Vib, Oil P, Oil T) sampled at 1 Hz.',
      liveValue: `${data?.quality?.samples || 0} frames · 1 Hz deterministic`,
      formula: 'y_meas = [RPM, EGT, CHT, ...]^T',
    },
    {
      step: 2,
      title: 'Residuals',
      badge: 'DIGITAL TWIN',
      icon: Cpu,
      desc: 'First-principles physics twin computes expected thermodynamic states; delta residuals isolated.',
      liveValue: topFeature ? `Max: ${topFeature.label} (Δ ${topFeature.residual > 0 ? '+' : ''}${topFeature.residual} ${topFeature.unit})` : 'All Residuals Nominal',
      formula: 'ε_i = y_{meas,i} - y_{twin,i}',
    },
    {
      step: 3,
      title: 'Diagnosis',
      badge: 'CLASSIFICATION',
      icon: ShieldCheck,
      desc: 'Deterministic fault signature matching evaluates multi-channel patterns against aerospace failure modes.',
      liveValue: finding?.failure_mode || 'Nominal Condition',
      formula: 'M* = argmax P(Mode | {ε_i})',
    },
    {
      step: 4,
      title: 'Health',
      badge: 'PROGNOSTICS',
      icon: Gauge,
      desc: 'Multi-penalty health index integrates sensor penalties and cumulative thermodynamic wear.',
      liveValue: `${data?.health_index?.toFixed(1) || 100}% Health Score`,
      formula: 'H = 100 - (∑ w_i P_i + W_wear)',
    },
    {
      step: 5,
      title: 'RUL',
      badge: 'PROJECTION',
      icon: Clock3,
      desc: 'Instantaneous damage rate extrapolates remaining wear budget to forecast flight hours to boundary.',
      liveValue: `${data?.rul?.hours?.toFixed(1) || 800} hrs Remaining`,
      formula: 'RUL = (1 - Wear) / ẇ(t)',
    },
    {
      step: 6,
      title: 'Recommendation',
      badge: 'DECISION',
      icon: Wrench,
      desc: 'Prescriptive decision engine produces actionable work orders, borescope directives, and dispatch status.',
      liveValue: data?.mission?.decision || 'WITHIN DEMO ENVELOPE',
      formula: 'Action = f(Mode, Priority, Risk)',
    },
  ]

  const handleRestart = () => {
    if (onRestart) {
      onRestart()
    } else if (onStart) {
      onStart(activeScenario)
    }
  }

  return (
    <section className="judge-demo v-panel" aria-label="Judge demo mode">
      {/* Top Header Banner */}
      <div className="judge-demo-head">
        <div>
          <div className="judge-demo-eyebrows">
            <span className="v-eyebrow">
              <Sparkles size={12} className="v-sparkle-icon" /> AEROSPACE PHM EVALUATION SUITE · SIH26054
            </span>
            <span className="judge-mode-tag">60-SECOND DETERMINISTIC WALKTHROUGH</span>
          </div>
          <h2>Judge Demo Mode</h2>
          <p>
            One-click deterministic fault injection on the VAYU-01 digital twin. Observe real-time physics residual growth,
            fault classification, health degradation, RUL countdown, and actionable maintenance prescriptions.
          </p>
        </div>
        <div className="judge-head-badges">
          <span className="v-badge purple">
            <Radio size={11} /> LIVE TWIN
          </span>
          <span className={`v-badge ${isRunning ? 'green' : 'amber'}`}>
            <span className={`judge-pulse-dot ${isRunning ? 'pulse' : ''}`} />
            {isRunning ? 'SIMULATION TICKING' : 'SIMULATION PAUSED'}
          </span>
        </div>
      </div>

      {/* 1. SCENARIO SELECTOR: Rich One-Click Cards */}
      <div className="judge-scenarios-section">
        <div className="judge-section-bar">
          <span className="judge-subheading">1. SCENARIO SELECTOR — ONE-CLICK DETERMINISTIC FAULT MODELS</span>
          <span className="judge-subhint">Clicking any scenario resets twin to t=0 and executes deterministic physics evolution</span>
        </div>

        <div className="judge-scenario-cards" role="radiogroup" aria-label="Fault scenario selector">
          {scenarios.map(s => {
            const isSelected = activeScenario === s.id
            const Icon = s.icon
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={isSelected}
                disabled={busy}
                onClick={() => onStart(s.id)}
                className={`judge-scenario-card ${s.tone} ${isSelected ? 'selected' : ''}`}
              >
                <div className="judge-card-header">
                  <div className="judge-card-icon-wrap">
                    <Icon size={18} />
                  </div>
                  <div className="judge-card-codes">
                    <span className="judge-card-code">{s.code}</span>
                    <span className="judge-card-cat">{s.category}</span>
                  </div>
                  {isSelected && <span className="judge-card-active-pill">ACTIVE</span>}
                </div>

                <div className="judge-card-body">
                  <h4 className="judge-card-title">{s.label}</h4>
                  <span className="judge-card-subtitle">{s.subtitle}</span>
                  <p className="judge-card-desc">{s.description}</p>
                </div>

                <div className="judge-card-footer">
                  <div className="judge-card-channels">
                    {s.channels.map((ch, idx) => (
                      <span key={idx} className="judge-channel-tag">{ch}</span>
                    ))}
                  </div>
                  <div className="judge-card-action">
                    <span>{isSelected ? 'RUNNING MODEL' : 'INITIALIZE'}</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. DEMO CONTROLS BAR */}
      <div className="judge-controls-strip">
        <div className="judge-control-buttons">
          <button
            className={`v-button ${isRunning ? '' : 'primary'} judge-btn-play`}
            disabled={busy}
            onClick={() => onPause(!isRunning)}
            aria-label={isRunning ? 'Pause simulation' : 'Play simulation'}
          >
            {isRunning ? <Pause size={15} /> : <Play size={15} />}
            <b>{isRunning ? 'Pause' : 'Play'}</b>
          </button>

          <button
            className="v-button judge-btn-restart"
            disabled={busy}
            onClick={handleRestart}
            aria-label="Restart scenario from healthy baseline"
          >
            <RotateCcw size={15} />
            <b>Restart</b>
          </button>
        </div>

        <div className="judge-control-telemetry">
          <div className="judge-control-metric">
            <span className="judge-ctrl-label">EXPOSURE CLOCK</span>
            <span className="judge-ctrl-value mono">
              <Clock3 size={13} /> T+{progress.elapsed_seconds.toFixed(1)}s
            </span>
          </div>

          <div className="judge-control-metric">
            <span className="judge-ctrl-label">DETERMINISTIC RATE</span>
            <span className="judge-ctrl-value">1.0 Hz Physical ODE</span>
          </div>

          <div className="judge-control-metric">
            <span className="judge-ctrl-label">ACTIVE MODEL</span>
            <span className="judge-ctrl-value highlight">{currentScenarioMeta.label}</span>
          </div>

          <div className="judge-control-metric">
            <span className="judge-ctrl-label">CURRENT STAGE</span>
            <span className="judge-ctrl-value stage-badge">Stage {currentStageIndex} of 6</span>
          </div>
        </div>
      </div>

      {/* 3. AUTOMATIC FAULT EVOLUTION: 6 Sequential Deterministic Stages */}
      <div className="judge-evolution-section">
        <div className="judge-section-bar">
          <span className="judge-subheading">2. AUTOMATIC FAULT EVOLUTION — 6 DETERMINISTIC PHASES</span>
          <span className="judge-subhint">
            Severity: {progress.severity_percent.toFixed(1)}% · Monotonic mathematical ramp S(t) = 1 - e^(-t / 45s)
          </span>
        </div>

        <div className="judge-evolution-timeline">
          {/* Continuous progress bar behind stages */}
          <div className="judge-timeline-track">
            <div
              className="judge-timeline-fill"
              style={{
                width: `${Math.min(100, Math.max(5, (currentStageIndex / 6) * 100))}%`,
              }}
            />
          </div>

          <div className="judge-stages-grid">
            {stageDefinitions.map((stageDef, index) => {
              const isPassed = stageDef.condition(progress, data)
              const isCurrent = currentStageIndex === stageDef.stage
              const stageNum = index + 1

              let stageClass = 'upcoming'
              if (isCurrent) stageClass = 'active'
              else if (isPassed) stageClass = 'completed'

              return (
                <motion.div
                  key={stageDef.title}
                  className={`judge-stage-node ${stageClass}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="judge-stage-top">
                    <div className="judge-stage-circle">
                      {stageClass === 'completed' && !isCurrent ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <span>{stageNum}</span>
                      )}
                    </div>
                    <span className="judge-stage-tag">
                      {isCurrent ? 'ACTIVE' : stageClass === 'completed' ? 'DONE' : 'PENDING'}
                    </span>
                  </div>

                  <div className="judge-stage-content">
                    <h5 className="judge-stage-title">{stageDef.shortTitle}</h5>
                    <span className="judge-stage-trigger">{stageDef.triggerDesc}</span>
                    <p className="judge-stage-note">{stageDef.physicsNote}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. JUDGE SUMMARY PANEL: 6 Required Evaluation Fields */}
      <div className="judge-summary-section">
        <div className="judge-section-bar">
          <span className="judge-subheading">3. JUDGE SUMMARY PANEL — PHM DECISION INTELLIGENCE</span>
          <span className="judge-subhint">Corroborated by digital twin residual matrix and explainability weights</span>
        </div>

        <div className="judge-summary-grid">
          {/* 1. FAULT TYPE */}
          <div className="judge-metric-box">
            <span className="judge-metric-title">FAULT TYPE</span>
            <div className="judge-metric-body">
              <strong className="judge-metric-value">{currentScenarioMeta.label}</strong>
              <div className="judge-metric-tags">
                <span className="judge-metric-pill">{currentScenarioMeta.category}</span>
                <span className={`judge-metric-pill priority ${(finding?.priority || 'routine').toLowerCase()}`}>
                  {(finding?.priority || 'ROUTINE').toUpperCase()}
                </span>
              </div>
            </div>
            <span className="judge-metric-footnote">Classification: {finding?.failure_mode || 'Nominal Condition'}</span>
          </div>

          {/* 2. HEALTH SCORE */}
          <div className={`judge-metric-box ${data?.health_index < 60 ? 'red' : data?.health_index <= 85 ? 'amber' : 'green'}`}>
            <span className="judge-metric-title">HEALTH SCORE</span>
            <div className="judge-metric-body">
              <strong className="judge-metric-value health-val">
                {data?.health_index?.toFixed(1) ?? '100.0'}
                <small>/ 100</small>
              </strong>
              <div className="judge-health-mini-track">
                <div
                  className="judge-health-mini-fill"
                  style={{ width: `${Math.max(0, Math.min(100, data?.health_index ?? 100))}%` }}
                />
              </div>
            </div>
            <span className="judge-metric-footnote">
              {data?.health_index >= 85 ? 'Nominal Flight Clearance' : data?.health_index >= 60 ? 'Monitor Condition Degradation' : 'Critical Maintenance Threshold'}
            </span>
          </div>

          {/* 3. RUL REMAINING */}
          <div className="judge-metric-box">
            <span className="judge-metric-title">RUL REMAINING</span>
            <div className="judge-metric-body">
              <strong className="judge-metric-value rul-val">
                {data?.rul?.hours?.toFixed(1) ?? '800.0'}
                <small>hrs</small>
              </strong>
              <span className="judge-rul-delta">
                <TrendingDown size={12} /> Rate: {data?.rul?.delta_hours ? `${data.rul.delta_hours.toFixed(2)} h/min` : '-0.02 h/min'}
              </span>
            </div>
            <span className="judge-metric-footnote">
              Sensitivity Band: {data?.rul?.lower_hours?.toFixed(0) || '0'}h – {data?.rul?.upper_hours?.toFixed(0) || '0'}h (±35%)
            </span>
          </div>

          {/* 4. CONFIDENCE */}
          <div className="judge-metric-box">
            <span className="judge-metric-title">CONFIDENCE</span>
            <div className="judge-metric-body">
              <strong className="judge-metric-value conf-val">
                {data?.explainability?.confidence_percent?.toFixed(0) ?? '95'}
                <small>%</small>
              </strong>
              <span className="judge-conf-badge">
                {confidenceLabel(data?.explainability?.confidence_percent ?? 95)} Confidence
              </span>
            </div>
            <span className="judge-metric-footnote">Sample support: {data?.quality?.samples || 0} frames</span>
          </div>

          {/* 5. SEVERITY */}
          <div className="judge-metric-box">
            <span className="judge-metric-title">SEVERITY</span>
            <div className="judge-metric-body">
              <strong className="judge-metric-value sev-val">
                {progress.severity_percent.toFixed(1)}
                <small>%</small>
              </strong>
              <div className="judge-sev-mini-bar">
                <div
                  className="judge-sev-mini-fill"
                  style={{ width: `${Math.min(100, progress.severity_percent)}%` }}
                />
              </div>
            </div>
            <span className="judge-metric-footnote">
              {progress.severity_percent === 0 ? 'Zero Fault Severity' : progress.severity_percent < 30 ? 'Incipient Stage' : progress.severity_percent < 60 ? 'Moderate Anomaly' : 'Severe Fault Exposure'}
            </span>
          </div>

          {/* 6. RECOMMENDED ACTION */}
          <div className="judge-metric-box wide action-box">
            <span className="judge-metric-title">RECOMMENDED ACTION</span>
            <div className="judge-action-body">
              <div className="judge-action-icon-wrap">
                <Wrench size={18} />
              </div>
              <div className="judge-action-text">
                <p className="judge-action-directive">
                  {finding?.recommended_action || 'Continue scheduled maintenance inspection.'}
                </p>
                <div className="judge-action-meta">
                  <span>Estimated Downtime: <b>{finding?.estimated_hours || 0.5} hours</b></span>
                  <span>Affected Channels: <b>{finding?.features?.join(', ') || 'Nominal'}</b></span>
                  <span>Mission Decision: <b className="highlight">{data?.mission?.decision || 'CLEAR FOR FLIGHT'}</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DEMONSTRATION NARRATIVE: Telemetry → Residuals → Diagnosis → Health → RUL → Recommendation */}
      <div className="judge-narrative-section">
        <div className="judge-section-bar">
          <span className="judge-subheading">4. DEMONSTRATION NARRATIVE — THE COMPLETE AEROSPACE PHM PIPELINE</span>
          <span className="judge-subhint">Click any pipeline block to inspect underlying mathematical formulations</span>
        </div>

        <div className="judge-narrative-strip">
          {narrativeSteps.map((step, idx) => {
            const Icon = step.icon
            const isSelected = selectedNarrativeStep === step.step
            const isLast = idx === narrativeSteps.length - 1

            return (
              <div key={step.step} className="judge-narrative-item-wrapper">
                <button
                  className={`judge-narrative-block ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedNarrativeStep(isSelected ? null : step.step)}
                  aria-expanded={isSelected}
                >
                  <div className="judge-narrative-top">
                    <span className="judge-narrative-step">0{step.step}</span>
                    <span className="judge-narrative-badge">{step.badge}</span>
                  </div>

                  <div className="judge-narrative-main">
                    <div className="judge-narrative-title-row">
                      <Icon size={16} className="judge-narrative-icon" />
                      <h4>{step.title}</h4>
                    </div>
                    <span className="judge-narrative-live">{step.liveValue}</span>
                    <p className="judge-narrative-desc">{step.desc}</p>
                  </div>

                  <div className="judge-narrative-bottom">
                    <code className="judge-narrative-math">{step.formula}</code>
                  </div>
                </button>

                {!isLast && (
                  <div className="judge-narrative-arrow" aria-hidden="true">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Narrative Expansion Modal/Drawer */}
        <AnimatePresence>
          {selectedNarrativeStep && (
            <motion.div
              className="judge-narrative-expanded-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {(() => {
                const cur = narrativeSteps.find(s => s.step === selectedNarrativeStep)
                if (!cur) return null
                return (
                  <div className="judge-narrative-detail">
                    <div className="judge-detail-header">
                      <cur.icon size={20} />
                      <div>
                        <h4>PHM Pipeline Deep-Dive: {cur.title} ({cur.badge})</h4>
                        <span>Mathematical Formulation & Architecture Verification</span>
                      </div>
                      <button className="v-icon-button" onClick={() => setSelectedNarrativeStep(null)}>
                        ✕
                      </button>
                    </div>
                    <div className="judge-detail-body">
                      <p>{cur.desc}</p>
                      <div className="judge-detail-math-box">
                        <span className="mono-label">MATHEMATICAL MODEL:</span>
                        <code>{cur.formula}</code>
                      </div>
                      <div className="judge-detail-status-box">
                        <span className="mono-label">LIVE ENGINE VALUE:</span>
                        <b>{cur.liveValue}</b>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
