import { useState, useRef } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Cpu,
  Download,
  Flame,
  Gauge,
  Info,
  Layers,
  Radio,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react'
import './architecture.css'

export default function Architecture() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedJudgeStep, setSelectedJudgeStep] = useState(1)
  const [toast, setToast] = useState('')

  const d1Ref = useRef(null)
  const d2Ref = useRef(null)
  const d3Ref = useRef(null)
  const d4Ref = useRef(null)

  const showToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  // Copy SVG with standalone embedded CSS
  const handleCopySvg = ref => {
    if (!ref.current) return
    const svgEl = ref.current.querySelector('svg')
    if (!svgEl) return
    const serializer = new XMLSerializer()
    let svgStr = serializer.serializeToString(svgEl)
    if (!svgStr.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      svgStr = svgStr.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
    }
    navigator.clipboard.writeText(svgStr).then(
      () => showToast('Vector SVG markup copied to clipboard!'),
      () => showToast('Failed to copy SVG.')
    )
  }

  // Download high-resolution SVG
  const handleDownloadSvg = (ref, filename) => {
    if (!ref.current) return
    const svgEl = ref.current.querySelector('svg')
    if (!svgEl) return
    const serializer = new XMLSerializer()
    let svgStr = serializer.serializeToString(svgEl)
    if (!svgStr.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      svgStr = svgStr.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
    }
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(`Exported ${filename}.svg successfully!`)
  }

  // Export all diagrams sequentially
  const handleExportAll = () => {
    handleDownloadSvg(d1Ref, 'SKYNEX-System-Architecture-SIH26054')
    setTimeout(() => handleDownloadSvg(d2Ref, 'SKYNEX-Digital-Twin-Workflow-SIH26054'), 350)
    setTimeout(() => handleDownloadSvg(d3Ref, 'SKYNEX-PHM-Pipeline-SIH26054'), 700)
    setTimeout(() => handleDownloadSvg(d4Ref, 'SKYNEX-Fleet-Architecture-SIH26054'), 1050)
  }

  // 7-Stage Judge Mode Narrative
  const judgeSteps = [
    {
      id: 1,
      title: 'Telemetry',
      sub: 'Multi-Sensor Ingestion',
      oneLiner: 'Continuous 1 Hz acquisition across 7 core propulsion channels with monotonic timestamping.',
      equation: 'y(t) = [RPM, EGT, CHT, FuelFlow, Vib, OilP, OilT]^T',
      valueProp: 'Zero physical blindspots. Captures mechanical, thermodynamic, and fluid dynamic signatures.',
      example: 'Sensor streams validated at edge: RPM tachometer, EGT thermocouples, vibration accelerometers.',
      icon: Radio,
    },
    {
      id: 2,
      title: 'Digital Twin',
      sub: 'First-Principles Physics',
      oneLiner: 'Reduced-order thermodynamic engine model computes real-time expected nominal operating states.',
      equation: 'ẋ = f(x, u, θ),  ŷ = g(x, u)',
      valueProp: 'Eliminates unvalidated black-box hallucinations. Physics-informed baseline verified on engine bench.',
      example: 'Computes nominal exhaust temperature (607°C) and pressure ratio (8.6) given current RPM target.',
      icon: Cpu,
    },
    {
      id: 3,
      title: 'Residual Analysis',
      sub: 'Delta Isolation',
      oneLiner: 'Computes observed vs. expected parameter deltas against dynamic statistical tolerance envelopes.',
      equation: 'ε_i(t) = y_{meas,i}(t) - ŷ_{twin,i}(t)',
      valueProp: 'Detects micro-deviations before physical alarm thresholds or redlines are breached.',
      example: 'Isolates +62°C EGT residual surge and +7.0 mm/s vibration excursion during early bearing wear.',
      icon: Activity,
    },
    {
      id: 4,
      title: 'Fault Detection',
      sub: 'Signature Verification',
      oneLiner: 'Multi-channel statistical envelope testing verifies monotonic fault ramp progression (S ≥ 12%).',
      equation: '|ε_i(t)| > τ_i  ∧  S(t) = 1 - e^{-t/45s} ≥ 0.12',
      valueProp: 'Filters out transient electrical sensor noise while guaranteeing early incipient anomaly detection.',
      example: 'Multi-residual correlation confirms genuine rotating assembly wear rather than a loose wire.',
      icon: AlertTriangle,
    },
    {
      id: 5,
      title: 'Health Assessment',
      sub: 'Composite Scoring',
      oneLiner: 'Integrates normalized residual penalties and wear accumulation into a unified 0-100 Health Score.',
      equation: 'H(t) = 100 - [∑ w_i P_i(t) + W_{wear}(t) · 25]',
      valueProp: 'Provides flight directors with an instantaneous, deterministic propulsion readiness index.',
      example: 'Health Score decays from 100% (Nominal) to 78.4% (Monitor) as mechanical wear penalty builds.',
      icon: Gauge,
    },
    {
      id: 6,
      title: 'RUL Prediction',
      sub: 'Prognostic Countdown',
      oneLiner: 'Instantaneous damage rate integrates wear budget to project remaining flight hours with ±35% bounds.',
      equation: 'RUL(t) = [1 - W(t)] / ẇ(t),  ẇ = f(thermal, load, vib)',
      valueProp: 'Replaces wasteful fixed calendar maintenance with condition-based operational dispatch.',
      example: 'Predicts 482 flight hours remaining; accelerated damage rate steepens countdown by -0.08 h/min.',
      icon: Clock3,
    },
    {
      id: 7,
      title: 'Recommendation',
      sub: 'Prescriptive Decision',
      oneLiner: 'Prescriptive expert decision engine generates actionable work orders, borescope directives, and flight safety constraints.',
      equation: 'Directive = f(Mode, Severity, Priority, Downtime)',
      valueProp: 'Directly bridges prognostic intelligence with maintenance crews, eliminating mission dispatch delays.',
      example: 'Issues "Inspect bearings, mounts, and oil debris; schedule borescope examination (Est: 6.0h)".',
      icon: Wrench,
    },
  ]

  const activeJudgeStepData = judgeSteps.find(s => s.id === selectedJudgeStep) || judgeSteps[0]

  return (
    <div className="v2 architecture-page">
      {/* Top Header Banner */}
      <div className="arch-header">
        <div className="arch-header-left">
          <div className="v-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#63ddbc' }}>
            <Sparkles size={13} />
            <span>AEROSPACE SYSTEMS ENGINEERING · SIH26054 GRAND FINALE PRESENTATION ASSETS</span>
          </div>
          <h1>System Architecture & Digital Twin Schematics</h1>
          <p>
            Official aerospace-grade architectural diagrams for the SKYNEX Prognostics & Health Management (PHM) platform.
            Illustrates the complete end-to-end data acquisition pipeline, physics-informed digital twin state estimators,
            residual analysis matrices, RUL prognostic algorithms, and distributed fleet hierarchy. Conforms to GE Aerospace,
            Honeywell Forge, Rolls-Royce Intelligent Engine, and ISO-13374 condition monitoring standards.
          </p>
        </div>

        <div className="arch-controls">
          <button className="arch-export-master" onClick={handleExportAll} title="Export all 4 SVG diagrams with embedded vector styles">
            <Download size={15} />
            <b>Export All SVGs</b>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. JUDGE MODE: "How SKYNEX Works" Executive Briefing                      */}
      {/* ========================================================================= */}
      <section className="judge-briefing-card" aria-labelledby="judge-mode-heading">
        <div className="judge-briefing-header">
          <div>
            <div className="judge-briefing-eyebrow">
              <Zap size={13} />
              <span>JUDGE EVALUATION WALKTHROUGH // 60-SECOND EXECUTIVE BRIEFING</span>
            </div>
            <h2 id="judge-mode-heading">How SKYNEX Works — The Aerospace PHM Pipeline</h2>
            <p>
              Click any stage below to inspect its mathematical formulation, physical mechanism, and judge value proposition.
              The pipeline transforms raw 1 Hz sensor telemetry into actionable maintenance and airworthiness decisions.
            </p>
          </div>
          <span className="judge-briefing-badge">ZERO-HALLUCINATION DETERMINISTIC ARCHITECTURE</span>
        </div>

        {/* 7-Step Horizontal Timeline */}
        <div className="judge-steps-timeline" role="tablist" aria-label="PHM Pipeline Steps">
          {judgeSteps.map(step => {
            const isSelected = selectedJudgeStep === step.id
            const Icon = step.icon
            return (
              <button
                key={step.id}
                role="tab"
                aria-selected={isSelected}
                className={`judge-step-node ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedJudgeStep(step.id)}
              >
                <div className="judge-step-top">
                  <span className="judge-step-num">0{step.id}</span>
                  <Icon size={14} color={isSelected ? '#63ddbc' : '#8ab6e8'} />
                </div>
                <h4 className="judge-step-title">{step.title}</h4>
                <p className="judge-step-summary">{step.oneLiner}</p>
                <span className="judge-step-badge">{step.sub}</span>
              </button>
            )
          })}
        </div>

        {/* Selected Stage Expanded Detail Box */}
        <div className="judge-expanded-box">
          <div className="judge-expanded-col">
            <h4>
              Stage 0{activeJudgeStepData.id}: {activeJudgeStepData.title} ({activeJudgeStepData.sub})
            </h4>
            <p>{activeJudgeStepData.oneLiner}</p>
            <div className="judge-formula-pill">
              <span style={{ color: '#7a96a0', fontWeight: 'bold' }}>MATHEMATICAL MODEL:</span>
              <code>{activeJudgeStepData.equation}</code>
            </div>
          </div>

          <div className="judge-expanded-col">
            <div className="judge-value-prop">
              <strong>JUDGE VALUE PROPOSITION</strong>
              <span>{activeJudgeStepData.valueProp}</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#88a6b0' }}>
              <b style={{ color: '#63ddbc' }}>Aerospace Example: </b>
              {activeJudgeStepData.example}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="arch-tabs" role="tablist" aria-label="Architecture Diagram Views">
        <button
          className={`arch-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Layers size={14} />
          <span>All Diagrams</span>
          <span className="arch-tab-badge">4</span>
        </button>
        <button
          className={`arch-tab-btn ${activeTab === 'd1' ? 'active' : ''}`}
          onClick={() => setActiveTab('d1')}
        >
          <Workflow size={14} />
          <span>1. System Architecture</span>
        </button>
        <button
          className={`arch-tab-btn ${activeTab === 'd2' ? 'active' : ''}`}
          onClick={() => setActiveTab('d2')}
        >
          <Cpu size={14} />
          <span>2. Digital Twin Workflow</span>
        </button>
        <button
          className={`arch-tab-btn ${activeTab === 'd3' ? 'active' : ''}`}
          onClick={() => setActiveTab('d3')}
        >
          <Activity size={14} />
          <span>3. PHM Pipeline</span>
        </button>
        <button
          className={`arch-tab-btn ${activeTab === 'd4' ? 'active' : ''}`}
          onClick={() => setActiveTab('d4')}
        >
          <Boxes size={14} />
          <span>4. Fleet Monitoring Architecture</span>
        </button>
      </div>

      {/* Diagram Grid / Views */}
      <div className="arch-diagrams-grid">
        {/* ========================================================================= */}
        {/* DIAGRAM 1: SYSTEM ARCHITECTURE DIAGRAM (CLEAN VERTICAL WORKFLOW)          */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'd1') && (
          <section className="arch-diagram-card" ref={d1Ref} aria-labelledby="d1-title">
            <div className="arch-card-header">
              <div className="arch-card-header-left">
                <div className="arch-diagram-num">01</div>
                <div>
                  <h3 id="d1-title">Diagram 1: System Architecture</h3>
                  <span>Clean vertical workflow with animated flow arrows, aerospace telemetry buses, and deterministic stages</span>
                </div>
              </div>
              <div className="arch-card-actions">
                <button
                  className="arch-card-btn"
                  onClick={() => handleCopySvg(d1Ref)}
                  title="Copy SVG markup to clipboard"
                >
                  <Copy size={13} /> Copy SVG
                </button>
                <button
                  className="arch-card-btn"
                  onClick={() => handleDownloadSvg(d1Ref, 'SKYNEX-System-Architecture-SIH26054')}
                  title="Download standalone vector SVG"
                >
                  <Download size={13} /> Download SVG
                </button>
              </div>
            </div>

            <div className="arch-card-svg-container">
              <svg
                viewBox="0 0 960 980"
                width="960"
                height="980"
                xmlns="http://www.w3.org/2000/svg"
                style={{ background: '#091218', borderRadius: '10px' }}
              >
                <defs>
                  <style>{`
                    @keyframes flowDash {
                      to { stroke-dashoffset: -20; }
                    }
                    @keyframes pulseGlow {
                      0%, 100% { opacity: 0.6; }
                      50% { opacity: 1; }
                    }
                    .anim-flow {
                      stroke-dasharray: 6, 4;
                      animation: flowDash 1.2s linear infinite;
                    }
                    .anim-pulse {
                      animation: pulseGlow 2s ease-in-out infinite;
                    }
                  `}</style>
                  <linearGradient id="d1-card-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#152834" />
                    <stop offset="100%" stopColor="#0d1820" />
                  </linearGradient>
                  <linearGradient id="d1-bus-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#63ddbc" />
                    <stop offset="50%" stopColor="#8ab6e8" />
                    <stop offset="100%" stopColor="#aa9ae4" />
                  </linearGradient>
                  <filter id="d1-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#63ddbc" floodOpacity="0.4" />
                  </filter>
                  <marker id="d1-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#63ddbc" />
                  </marker>
                  <pattern id="d1-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff07" strokeWidth="1" />
                  </pattern>
                </defs>

                {/* Background Grid & Framing */}
                <rect width="960" height="980" fill="#091218" />
                <rect width="960" height="980" fill="url(#d1-grid)" />
                <rect x="18" y="18" width="924" height="944" rx="12" fill="none" stroke="#63ddbc25" strokeWidth="1.5" />
                <rect x="24" y="24" width="912" height="932" rx="8" fill="none" stroke="#ffffff0a" strokeWidth="1" strokeDasharray="6 6" />

                {/* HUD Corner Reticles */}
                <path d="M 28 42 L 28 28 L 42 28" fill="none" stroke="#63ddbc" strokeWidth="2" />
                <path d="M 932 42 L 932 28 L 918 28" fill="none" stroke="#63ddbc" strokeWidth="2" />
                <path d="M 28 938 L 28 952 L 42 952" fill="none" stroke="#63ddbc" strokeWidth="2" />
                <path d="M 932 938 L 932 952 L 918 952" fill="none" stroke="#63ddbc" strokeWidth="2" />

                {/* Header Strip */}
                <rect x="36" y="36" width="888" height="50" rx="7" fill="#132630" stroke="#63ddbc55" strokeWidth="1" />
                <text x="56" y="66" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="13" fontWeight="bold" letterSpacing="1.5">
                  SYSTEM ARCHITECTURE // COMPLETE END-TO-END PHM WORKFLOW
                </text>
                <text x="750" y="66" fill="#8ab6e8" fontFamily="'DM Mono', monospace" fontSize="11" letterSpacing="1">
                  NASA/GE AERO SPEC
                </text>

                {/* Central Connecting Bus Line with Animation */}
                <line x1="480" y1="135" x2="480" y2="875" stroke="url(#d1-bus-grad)" strokeWidth="3" className="anim-flow" />

                {/* ================= 8 CLEAN VERTICAL STACK NODES ================= */}

                {/* Node 1: Telemetry Sources */}
                <g transform="translate(190, 105)">
                  <rect x="0" y="0" width="580" height="68" rx="8" fill="url(#d1-card-grad)" stroke="#63ddbc" strokeWidth="1.2" filter="url(#d1-glow)" />
                  <rect x="0" y="0" width="6" height="68" rx="3" fill="#63ddbc" />
                  <text x="24" y="26" fill="#8ee7d0" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold" letterSpacing="1">LEVEL 01 // TELEMETRY SOURCES</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Telemetry Sources</text>
                  <text x="260" y="49" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">7 Propulsion Channels: RPM, EGT, CHT, Fuel, Vib, Oil P, Oil T</text>
                  <circle cx="560" cy="34" r="5" fill="#63ddbc" className="anim-pulse" />
                </g>

                <line x1="480" y1="173" x2="480" y2="200" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d1-arrow)" className="anim-flow" />

                {/* Node 2: Data Acquisition Layer */}
                <g transform="translate(190, 202)">
                  <rect x="0" y="0" width="580" height="68" rx="8" fill="url(#d1-card-grad)" stroke="#52bbbd" strokeWidth="1.2" />
                  <rect x="0" y="0" width="6" height="68" rx="3" fill="#52bbbd" />
                  <text x="24" y="26" fill="#7ed9dc" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold" letterSpacing="1">LEVEL 02 // DATA ACQUISITION LAYER</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Data Acquisition Layer</text>
                  <text x="260" y="49" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">1 Hz High-Rate Sampling · Anti-Aliasing · Monotonic Validation</text>
                  <circle cx="560" cy="34" r="5" fill="#52bbbd" />
                </g>

                <line x1="480" y1="270" x2="480" y2="297" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d1-arrow)" className="anim-flow" />

                {/* Node 3: Digital Twin Engine */}
                <g transform="translate(190, 299)">
                  <rect x="0" y="0" width="580" height="68" rx="8" fill="url(#d1-card-grad)" stroke="#8ab6e8" strokeWidth="1.2" />
                  <rect x="0" y="0" width="6" height="68" rx="3" fill="#8ab6e8" />
                  <text x="24" y="26" fill="#a4c7f0" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold" letterSpacing="1">LEVEL 03 // DIGITAL TWIN ENGINE</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Digital Twin Engine</text>
                  <text x="260" y="49" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">7-State Thermodynamic Reduced-Order Physics Model [ODE Core]</text>
                  <circle cx="560" cy="34" r="5" fill="#8ab6e8" />
                </g>

                <line x1="480" y1="367" x2="480" y2="394" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d1-arrow)" className="anim-flow" />

                {/* Node 4: Residual Analysis */}
                <g transform="translate(190, 396)">
                  <rect x="0" y="0" width="580" height="68" rx="8" fill="url(#d1-card-grad)" stroke="#aa9ae4" strokeWidth="1.2" />
                  <rect x="0" y="0" width="6" height="68" rx="3" fill="#aa9ae4" />
                  <text x="24" y="26" fill="#c3b8ed" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold" letterSpacing="1">LEVEL 04 // RESIDUAL ANALYSIS</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Residual Analysis</text>
                  <text x="260" y="49" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">ε_i = y_observed - y_expected · Dynamic Channel Tolerances</text>
                  <circle cx="560" cy="34" r="5" fill="#aa9ae4" />
                </g>

                <line x1="480" y1="464" x2="480" y2="491" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d1-arrow)" className="anim-flow" />

                {/* Node 5: Fault Detection */}
                <g transform="translate(190, 493)">
                  <rect x="0" y="0" width="580" height="68" rx="8" fill="url(#d1-card-grad)" stroke="#e9b969" strokeWidth="1.2" />
                  <rect x="0" y="0" width="6" height="68" rx="3" fill="#e9b969" />
                  <text x="24" y="26" fill="#f0ca85" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold" letterSpacing="1">LEVEL 05 // FAULT DETECTION</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Fault Detection</text>
                  <text x="260" y="49" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Envelope Thresholding · Monotonic Ramp Assertion S(t) ≥ 12%</text>
                  <circle cx="560" cy="34" r="5" fill="#e9b969" />
                </g>

                <line x1="480" y1="561" x2="480" y2="588" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d1-arrow)" className="anim-flow" />

                {/* Node 6: Health Assessment */}
                <g transform="translate(190, 590)">
                  <rect x="0" y="0" width="580" height="68" rx="8" fill="url(#d1-card-grad)" stroke="#63ddbc" strokeWidth="1.2" />
                  <rect x="0" y="0" width="6" height="68" rx="3" fill="#63ddbc" />
                  <text x="24" y="26" fill="#8ee7d0" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold" letterSpacing="1">LEVEL 06 // HEALTH ASSESSMENT</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Health Assessment</text>
                  <text x="260" y="49" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Composite Score (0-100) · Multi-Penalty Fusion · Risk Index</text>
                  <circle cx="560" cy="34" r="5" fill="#63ddbc" />
                </g>

                <line x1="480" y1="658" x2="480" y2="685" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d1-arrow)" className="anim-flow" />

                {/* Node 7: RUL Prediction */}
                <g transform="translate(190, 687)">
                  <rect x="0" y="0" width="580" height="68" rx="8" fill="url(#d1-card-grad)" stroke="#8ab6e8" strokeWidth="1.2" />
                  <rect x="0" y="0" width="6" height="68" rx="3" fill="#8ab6e8" />
                  <text x="24" y="26" fill="#a4c7f0" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold" letterSpacing="1">LEVEL 07 // RUL PREDICTION</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">RUL Prediction</text>
                  <text x="260" y="49" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Damage Accumulation Rate ẇ(t) · Flight Hours Countdown (±35%)</text>
                  <circle cx="560" cy="34" r="5" fill="#8ab6e8" />
                </g>

                <line x1="480" y1="755" x2="480" y2="782" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d1-arrow)" className="anim-flow" />

                {/* Node 8: Decision Support */}
                <g transform="translate(190, 784)">
                  <rect x="0" y="0" width="580" height="68" rx="8" fill="url(#d1-card-grad)" stroke="#63ddbc" strokeWidth="1.5" filter="url(#d1-glow)" />
                  <rect x="0" y="0" width="6" height="68" rx="3" fill="#63ddbc" />
                  <text x="24" y="26" fill="#8ee7d0" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold" letterSpacing="1">LEVEL 08 // DECISION SUPPORT</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Decision Support</text>
                  <text x="260" y="49" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Automated Work Orders · Flight Release Limits · Maintenance Plan</text>
                  <circle cx="560" cy="34" r="5" fill="#63ddbc" className="anim-pulse" />
                </g>

                {/* Callout Panels Left & Right */}
                <g transform="translate(42, 380)">
                  <rect x="0" y="0" width="132" height="175" rx="7" fill="#101d26" stroke="#63ddbc33" strokeWidth="1" />
                  <text x="12" y="24" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="9.5" fontWeight="bold">INPUT BUSES</text>
                  <text x="12" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• ARINC-429</text>
                  <text x="12" y="70" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• CAN Aerospace</text>
                  <text x="12" y="92" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• 1 Hz Real-Time</text>
                  <text x="12" y="114" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• Anti-Aliased</text>
                  <text x="12" y="136" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• Zero Synthetic Noise</text>
                  <rect x="12" y="150" width="108" height="15" rx="3" fill="#0c161d" />
                  <text x="66" y="161" textAnchor="middle" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="7.5">DETERMINISTIC</text>
                </g>

                <g transform="translate(786, 380)">
                  <rect x="0" y="0" width="132" height="175" rx="7" fill="#101d26" stroke="#8ab6e833" strokeWidth="1" />
                  <text x="12" y="24" fill="#8ab6e8" fontFamily="'DM Mono', monospace" fontSize="9.5" fontWeight="bold">PHM DIRECTIVES</text>
                  <text x="12" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• Health 0-100 Score</text>
                  <text x="12" y="70" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• RUL (Flight Hours)</text>
                  <text x="12" y="92" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• Mode Classification</text>
                  <text x="12" y="114" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• Priority Action</text>
                  <text x="12" y="136" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="9.5">• Dispatch Safety</text>
                  <rect x="12" y="150" width="108" height="15" rx="3" fill="#0c161d" />
                  <text x="66" y="161" textAnchor="middle" fill="#8ab6e8" fontFamily="'DM Mono', monospace" fontSize="7.5">AIRWORTHINESS</text>
                </g>

                {/* Footer Stamp */}
                <text x="480" y="905" textAnchor="middle" fill="#5c7987" fontFamily="'DM Mono', monospace" fontSize="10">
                  SKYNEX PROPULSION HEALTH MONITORING PIPELINE // GE AERO & HONEYWELL FORGE BENCHMARK
                </text>
              </svg>
            </div>

            <div className="arch-card-footer">
              <div>
                <b>Standard & Architecture:</b> Conforms to aerospace ISO-13374 condition monitoring standards with deterministic physics integration.
              </div>
              <div style={{ font: "700 9px 'DM Mono', monospace", color: '#63ddbc' }}>
                7 TELEMETRY CHANNELS → ODE TWIN → RESIDUAL ANALYSIS → HEALTH SCORE → RUL → DECISION
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAM 2: DIGITAL TWIN WORKFLOW DIAGRAM                                  */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'd2') && (
          <section className="arch-diagram-card" ref={d2Ref} aria-labelledby="d2-title">
            <div className="arch-card-header">
              <div className="arch-card-header-left">
                <div className="arch-diagram-num">02</div>
                <div>
                  <h3 id="d2-title">Diagram 2: Digital Twin Workflow</h3>
                  <span>Vertical flow with sensor icons, twin model visualization, and color-coded residual indicators</span>
                </div>
              </div>
              <div className="arch-card-actions">
                <button
                  className="arch-card-btn"
                  onClick={() => handleCopySvg(d2Ref)}
                  title="Copy SVG markup to clipboard"
                >
                  <Copy size={13} /> Copy SVG
                </button>
                <button
                  className="arch-card-btn"
                  onClick={() => handleDownloadSvg(d2Ref, 'SKYNEX-Digital-Twin-Workflow-SIH26054')}
                  title="Download standalone vector SVG"
                >
                  <Download size={13} /> Download SVG
                </button>
              </div>
            </div>

            <div className="arch-card-svg-container">
              <svg
                viewBox="0 0 960 920"
                width="960"
                height="920"
                xmlns="http://www.w3.org/2000/svg"
                style={{ background: '#091218', borderRadius: '10px' }}
              >
                <defs>
                  <style>{`
                    @keyframes twinFlow {
                      to { stroke-dashoffset: -20; }
                    }
                    .twin-line {
                      stroke-dasharray: 6, 4;
                      animation: twinFlow 1.2s linear infinite;
                    }
                  `}</style>
                  <linearGradient id="d2-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#152834" />
                    <stop offset="100%" stopColor="#0d1820" />
                  </linearGradient>
                  <marker id="d2-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#63ddbc" />
                  </marker>
                  <pattern id="d2-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff07" strokeWidth="1" />
                  </pattern>
                </defs>

                <rect width="960" height="920" fill="#091218" />
                <rect width="960" height="920" fill="url(#d2-grid)" />
                <rect x="18" y="18" width="924" height="884" rx="12" fill="none" stroke="#63ddbc25" strokeWidth="1.5" />

                {/* Header */}
                <rect x="36" y="36" width="888" height="50" rx="7" fill="#132630" stroke="#63ddbc55" strokeWidth="1" />
                <text x="56" y="66" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="13" fontWeight="bold" letterSpacing="1.5">
                  DIGITAL TWIN WORKFLOW // FIRST-PRINCIPLES THERMODYNAMIC ESTIMATION
                </text>
                <text x="730" y="66" fill="#aa9ae4" fontFamily="'DM Mono', monospace" fontSize="11">
                  CLOSED-LOOP RESIDUALS
                </text>

                {/* Vertical Central Bus */}
                <line x1="480" y1="130" x2="480" y2="820" stroke="#63ddbc" strokeWidth="2.5" className="twin-line" />

                {/* 1. Telemetry (With Sensor Icons) */}
                <g transform="translate(180, 105)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d2-grad)" stroke="#63ddbc" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#63ddbc" />
                  <text x="24" y="24" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">01 // TELEMETRY INGESTION</text>
                  <text x="24" y="48" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Telemetry</text>
                  {/* Sensor Pills with Glyphs */}
                  <g transform="translate(160, 32)">
                    <rect x="0" y="0" width="55" height="22" rx="4" fill="#0e1f26" stroke="#63ddbc44" />
                    <text x="27" y="15" textAnchor="middle" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="8">RPM</text>
                    <rect x="62" y="0" width="55" height="22" rx="4" fill="#0e1f26" stroke="#63ddbc44" />
                    <text x="89" y="15" textAnchor="middle" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="8">EGT</text>
                    <rect x="124" y="0" width="55" height="22" rx="4" fill="#0e1f26" stroke="#63ddbc44" />
                    <text x="151" y="15" textAnchor="middle" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="8">CHT</text>
                    <rect x="186" y="0" width="55" height="22" rx="4" fill="#0e1f26" stroke="#63ddbc44" />
                    <text x="213" y="15" textAnchor="middle" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="8">FUEL</text>
                    <rect x="248" y="0" width="55" height="22" rx="4" fill="#0e1f26" stroke="#63ddbc44" />
                    <text x="275" y="15" textAnchor="middle" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="8">VIB</text>
                    <rect x="310" y="0" width="55" height="22" rx="4" fill="#0e1f26" stroke="#63ddbc44" />
                    <text x="337" y="15" textAnchor="middle" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="8">OIL_P</text>
                    <rect x="372" y="0" width="55" height="22" rx="4" fill="#0e1f26" stroke="#63ddbc44" />
                    <text x="399" y="15" textAnchor="middle" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="8">OIL_T</text>
                  </g>
                </g>

                <line x1="480" y1="179" x2="480" y2="204" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d2-arrow)" className="twin-line" />

                {/* 2. Physics-Based Digital Twin (With Twin Model Visualization Schematic) */}
                <g transform="translate(180, 206)">
                  <rect x="0" y="0" width="600" height="100" rx="8" fill="url(#d2-grad)" stroke="#52bbbd" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="100" rx="3" fill="#52bbbd" />
                  <text x="24" y="24" fill="#7ed9dc" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">02 // THERMODYNAMIC ENGINE MODEL</text>
                  <text x="24" y="52" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Physics-Based Digital Twin</text>
                  <text x="24" y="72" fill="#8aa3ad" fontFamily="'DM Mono', monospace" fontSize="9">ẋ = f(x, u, θ) · 7-State ODE</text>
                  {/* Schematic Visualization of Engine Blading / Combustor */}
                  <g transform="translate(290, 20)">
                    <rect x="0" y="0" width="290" height="60" rx="6" fill="#0a171e" stroke="#52bbbd44" />
                    {/* Air Intake */}
                    <path d="M 12 30 L 35 15 L 35 45 Z" fill="#63ddbc22" stroke="#63ddbc" strokeWidth="1" />
                    <text x="20" y="54" fill="#63ddbc" fontSize="6.5" fontFamily="'DM Mono', monospace">INLET</text>
                    {/* Compressor Stages */}
                    <line x1="50" y1="18" x2="50" y2="42" stroke="#8ab6e8" strokeWidth="3" />
                    <line x1="65" y1="15" x2="65" y2="45" stroke="#8ab6e8" strokeWidth="3" />
                    <line x1="80" y1="12" x2="80" y2="48" stroke="#8ab6e8" strokeWidth="3" />
                    <text x="56" y="54" fill="#8ab6e8" fontSize="6.5" fontFamily="'DM Mono', monospace">COMPRESSOR</text>
                    {/* Burner / Combustor */}
                    <rect x="115" y="16" width="45" height="28" rx="4" fill="#e9b96922" stroke="#e9b969" strokeWidth="1" />
                    <circle cx="137" cy="30" r="4" fill="#e9b969" />
                    <text x="122" y="54" fill="#e9b969" fontSize="6.5" fontFamily="'DM Mono', monospace">BURNER</text>
                    {/* Turbine & Exhaust */}
                    <line x1="185" y1="12" x2="185" y2="48" stroke="#aa9ae4" strokeWidth="3" />
                    <line x1="200" y1="16" x2="200" y2="44" stroke="#aa9ae4" strokeWidth="3" />
                    <path d="M 220 18 L 245 25 L 245 35 L 220 42 Z" fill="#f47f7d22" stroke="#f47f7d" strokeWidth="1" />
                    <text x="195" y="54" fill="#aa9ae4" fontSize="6.5" fontFamily="'DM Mono', monospace">TURBINE</text>
                    <text x="248" y="32" fill="#8fa7b0" fontSize="7" fontFamily="'DM Mono', monospace">EXHAUST</text>
                  </g>
                </g>

                <line x1="480" y1="306" x2="480" y2="331" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d2-arrow)" className="twin-line" />

                {/* 3. Expected Parameters */}
                <g transform="translate(180, 333)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d2-grad)" stroke="#8ab6e8" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#8ab6e8" />
                  <text x="24" y="24" fill="#a4c7f0" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">03 // NOMINAL REFERENCE VECTORS</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Expected Parameters</text>
                  <text x="260" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">ŷ_twin(t) = g(x, u) · RPM: 5200, EGT: 607°C, Fuel: 17.5 L/h, Vib: 1.7</text>
                </g>

                <line x1="480" y1="407" x2="480" y2="432" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d2-arrow)" className="twin-line" />

                {/* 4. Residual Generation (With Color-Coded Residual Indicators) */}
                <g transform="translate(180, 434)">
                  <rect x="0" y="0" width="600" height="92" rx="8" fill="url(#d2-grad)" stroke="#aa9ae4" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="92" rx="3" fill="#aa9ae4" />
                  <text x="24" y="24" fill="#c3b8ed" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">04 // RESIDUAL GENERATION & THRESHOLDING</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Residual Generation</text>
                  <text x="24" y="70" fill="#8ba3ad" fontFamily="'DM Mono', monospace" fontSize="9">ε_i = y_meas,i - ŷ_twin,i</text>
                  {/* Color-Coded Residual Badges */}
                  <g transform="translate(230, 36)">
                    <rect x="0" y="0" width="105" height="36" rx="5" fill="#132c25" stroke="#63ddbc" strokeWidth="1" />
                    <circle cx="14" cy="18" r="4" fill="#63ddbc" />
                    <text x="26" y="16" fill="#63ddbc" fontSize="8" fontWeight="bold" fontFamily="'DM Mono', monospace">NOMINAL</text>
                    <text x="26" y="28" fill="#8ee7d0" fontSize="7.5" fontFamily="'DM Mono', monospace">Δ &lt; 0.12σ</text>

                    <rect x="120" y="0" width="105" height="36" rx="5" fill="#352814" stroke="#e9b969" strokeWidth="1" />
                    <circle cx="134" cy="18" r="4" fill="#e9b969" />
                    <text x="146" y="16" fill="#e9b969" fontSize="8" fontWeight="bold" fontFamily="'DM Mono', monospace">WARNING</text>
                    <text x="146" y="28" fill="#f0ca85" fontSize="7.5" fontFamily="'DM Mono', monospace">0.12σ ≤ Δ &lt; 0.8σ</text>

                    <rect x="240" y="0" width="105" height="36" rx="5" fill="#381919" stroke="#f47f7d" strokeWidth="1" />
                    <circle cx="254" cy="18" r="4" fill="#f47f7d" />
                    <text x="266" y="16" fill="#f47f7d" fontSize="8" fontWeight="bold" fontFamily="'DM Mono', monospace">CRITICAL</text>
                    <text x="266" y="28" fill="#fca5a5" fontSize="7.5" fontFamily="'DM Mono', monospace">Δ ≥ 0.8σ</text>
                  </g>
                </g>

                <line x1="480" y1="526" x2="480" y2="551" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d2-arrow)" className="twin-line" />

                {/* 5. Fault Detection */}
                <g transform="translate(180, 553)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d2-grad)" stroke="#e9b969" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#e9b969" />
                  <text x="24" y="24" fill="#f0ca85" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">05 // STATISTICAL ANOMALY TRIGGER</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Fault Detection</text>
                  <text x="260" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">|ε_i| &gt; τ_i · Monotonic Fault Ramp S(t) = 1 - e^(-t/45s)</text>
                </g>

                <line x1="480" y1="627" x2="480" y2="652" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d2-arrow)" className="twin-line" />

                {/* 6. Diagnosis */}
                <g transform="translate(180, 654)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d2-grad)" stroke="#8ab6e8" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#8ab6e8" />
                  <text x="24" y="24" fill="#a4c7f0" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">06 // FAILURE MODE ISOLATION</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Diagnosis</text>
                  <text x="260" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Deterministic Rules: Bearing Wear · Compressor Fouling · Leak · Bias</text>
                </g>

                <line x1="480" y1="728" x2="480" y2="753" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d2-arrow)" className="twin-line" />

                {/* 7. Recommendation */}
                <g transform="translate(180, 755)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d2-grad)" stroke="#63ddbc" strokeWidth="1.5" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#63ddbc" />
                  <text x="24" y="24" fill="#8ee7d0" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">07 // PRESCRIPTIVE AIRWORTHINESS DIRECTIVE</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Recommendation</text>
                  <text x="260" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Actionable Work Order · Borescope Directives · Flight Clearance</text>
                </g>

                {/* Footer Stamp */}
                <text x="480" y="865" textAnchor="middle" fill="#5c7987" fontFamily="'DM Mono', monospace" fontSize="10">
                  SKYNEX DIGITAL TWIN WORKFLOW // REDUCED-ORDER THERMODYNAMIC STATE ESTIMATOR
                </text>
              </svg>
            </div>

            <div className="arch-card-footer">
              <div>
                <b>Physics Integration:</b> Real-time closed-loop residuals generated by differential-algebraic equations.
              </div>
              <div style={{ font: "700 9px 'DM Mono', monospace", color: '#63ddbc' }}>
                TELEMETRY → DIGITAL TWIN → EXPECTED → RESIDUALS → DETECTION → DIAGNOSIS → RECOMMENDATION
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAM 3: PHM PIPELINE DIAGRAM                                           */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'd3') && (
          <section className="arch-diagram-card" ref={d3Ref} aria-labelledby="d3-title">
            <div className="arch-card-header">
              <div className="arch-card-header-left">
                <div className="arch-diagram-num">03</div>
                <div>
                  <h3 id="d3-title">Diagram 3: PHM Pipeline</h3>
                  <span>Vertical modular blocks with data flow animation, ISO-13374 architecture, and actionable logistics</span>
                </div>
              </div>
              <div className="arch-card-actions">
                <button
                  className="arch-card-btn"
                  onClick={() => handleCopySvg(d3Ref)}
                  title="Copy SVG markup to clipboard"
                >
                  <Copy size={13} /> Copy SVG
                </button>
                <button
                  className="arch-card-btn"
                  onClick={() => handleDownloadSvg(d3Ref, 'SKYNEX-PHM-Pipeline-SIH26054')}
                  title="Download standalone vector SVG"
                >
                  <Download size={13} /> Download SVG
                </button>
              </div>
            </div>

            <div className="arch-card-svg-container">
              <svg
                viewBox="0 0 960 860"
                width="960"
                height="860"
                xmlns="http://www.w3.org/2000/svg"
                style={{ background: '#091218', borderRadius: '10px' }}
              >
                <defs>
                  <style>{`
                    @keyframes phmFlow {
                      to { stroke-dashoffset: -20; }
                    }
                    .phm-line {
                      stroke-dasharray: 6, 4;
                      animation: phmFlow 1.2s linear infinite;
                    }
                  `}</style>
                  <linearGradient id="d3-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#152834" />
                    <stop offset="100%" stopColor="#0d1820" />
                  </linearGradient>
                  <marker id="d3-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#63ddbc" />
                  </marker>
                  <pattern id="d3-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff07" strokeWidth="1" />
                  </pattern>
                </defs>

                <rect width="960" height="860" fill="#091218" />
                <rect width="960" height="860" fill="url(#d3-grid)" />
                <rect x="18" y="18" width="924" height="824" rx="12" fill="none" stroke="#63ddbc25" strokeWidth="1.5" />

                {/* Header */}
                <rect x="36" y="36" width="888" height="50" rx="7" fill="#132630" stroke="#63ddbc55" strokeWidth="1" />
                <text x="56" y="66" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="13" fontWeight="bold" letterSpacing="1.5">
                  PROGNOSTICS & HEALTH MANAGEMENT (PHM) PIPELINE // ISO-13374
                </text>
                <text x="730" y="66" fill="#8ab6e8" fontFamily="'DM Mono', monospace" fontSize="11">
                  CONDITION-BASED
                </text>

                {/* Central Flow Line */}
                <line x1="480" y1="130" x2="480" y2="760" stroke="#63ddbc" strokeWidth="2.5" className="phm-line" />

                {/* 1. Sensor Data */}
                <g transform="translate(180, 105)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d3-grad)" stroke="#63ddbc" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#63ddbc" />
                  <text x="24" y="24" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">PHM TIER 01 // DATA ACQUISITION</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Sensor Data</text>
                  <text x="240" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Raw 7-Channel Flight Telemetry Ingestion @ 1 Hz · Time-Synchronized</text>
                </g>

                <line x1="480" y1="179" x2="480" y2="204" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d3-arrow)" className="phm-line" />

                {/* 2. Feature Extraction */}
                <g transform="translate(180, 206)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d3-grad)" stroke="#52bbbd" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#52bbbd" />
                  <text x="24" y="24" fill="#7ed9dc" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">PHM TIER 02 // FEATURE PROCESSING</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Feature Extraction</text>
                  <text x="240" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Signal Filtering · Residual Normalization Δy / σ · Dynamic Tolerance Envelopes</text>
                </g>

                <line x1="480" y1="280" x2="480" y2="305" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d3-arrow)" className="phm-line" />

                {/* 3. Fault Classification */}
                <g transform="translate(180, 307)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d3-grad)" stroke="#8ab6e8" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#8ab6e8" />
                  <text x="24" y="24" fill="#a4c7f0" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">PHM TIER 03 // DIAGNOSTIC ISOLATION</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Fault Classification</text>
                  <text x="240" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Deterministic Signature Rules: Bearing Wear, Fouling, Fuel Leak, Sensor Bias</text>
                </g>

                <line x1="480" y1="381" x2="480" y2="406" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d3-arrow)" className="phm-line" />

                {/* 4. Health Monitoring */}
                <g transform="translate(180, 408)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d3-grad)" stroke="#aa9ae4" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#aa9ae4" />
                  <text x="24" y="24" fill="#c3b8ed" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">PHM TIER 04 // HEALTH ASSESSMENT</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Health Monitoring</text>
                  <text x="240" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Composite Score (0-100) · Penalty Accumulation · Multi-Sensor Degradation Index</text>
                </g>

                <line x1="480" y1="482" x2="480" y2="507" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d3-arrow)" className="phm-line" />

                {/* 5. RUL Estimation */}
                <g transform="translate(180, 509)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d3-grad)" stroke="#e9b969" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#e9b969" />
                  <text x="24" y="24" fill="#f0ca85" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">PHM TIER 05 // PROGNOSTICS</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">RUL Estimation</text>
                  <text x="240" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Damage Accumulation Rate ẇ(t) · Remaining Wear Budget · Flight Hours Countdown</text>
                </g>

                <line x1="480" y1="583" x2="480" y2="608" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d3-arrow)" className="phm-line" />

                {/* 6. Maintenance Planning */}
                <g transform="translate(180, 610)">
                  <rect x="0" y="0" width="600" height="74" rx="8" fill="url(#d3-grad)" stroke="#63ddbc" strokeWidth="1.5" />
                  <rect x="0" y="0" width="6" height="74" rx="3" fill="#63ddbc" />
                  <text x="24" y="24" fill="#8ee7d0" fontFamily="'DM Mono', monospace" fontSize="9" fontWeight="bold">PHM TIER 06 // PRESCRIPTIVE LOGISTICS</text>
                  <text x="24" y="50" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">Maintenance Planning</text>
                  <text x="240" y="48" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">Automated Work Package Orders · Ground Crew Alerts · Airworthiness Clearance</text>
                </g>

                {/* Lower Legend Box */}
                <g transform="translate(50, 715)">
                  <rect x="0" y="0" width="860" height="75" rx="7" fill="#0d1820" stroke="#ffffff12" />
                  <text x="20" y="24" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold">
                    ISO-13374 AEROSPACE COMPLIANCE NOTES
                  </text>
                  <text x="20" y="46" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="10.5">
                    • <tspan fill="#d5e7e8" fontWeight="600">Layered Architecture:</tspan> Strictly separates signal acquisition, state estimation, prognostic extrapolation, and operational logistics.
                  </text>
                  <text x="20" y="64" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="10.5">
                    • <tspan fill="#d5e7e8" fontWeight="600">Zero Hallucination:</tspan> Every stage is governed by deterministic physical ODEs and auditable condition rules.
                  </text>
                </g>

                {/* Footer Stamp */}
                <text x="480" y="818" textAnchor="middle" fill="#5c7987" fontFamily="'DM Mono', monospace" fontSize="10">
                  SKYNEX PHM PIPELINE // PREDICTIVE AEROSPACE MAINTENANCE ARCHITECTURE
                </text>
              </svg>
            </div>

            <div className="arch-card-footer">
              <div>
                <b>Prognostic Methodology:</b> Condition-based wear integration forecasting operational life with ±35% sensitivity boundaries.
              </div>
              <div style={{ font: "700 9px 'DM Mono', monospace", color: '#63ddbc' }}>
                SENSOR DATA → FEATURE EXTRACTION → CLASSIFICATION → HEALTH → RUL → MAINTENANCE PLANNING
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAM 4: FLEET MONITORING ARCHITECTURE                                  */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'd4') && (
          <section className="arch-diagram-card" ref={d4Ref} aria-labelledby="d4-title">
            <div className="arch-card-header">
              <div className="arch-card-header-left">
                <div className="arch-diagram-num">04</div>
                <div>
                  <h3 id="d4-title">Diagram 4: Fleet Monitoring Architecture</h3>
                  <span>Multiple UAV visual nodes, communication lines, digital twin cluster, analytics layer, and command center</span>
                </div>
              </div>
              <div className="arch-card-actions">
                <button
                  className="arch-card-btn"
                  onClick={() => handleCopySvg(d4Ref)}
                  title="Copy SVG markup to clipboard"
                >
                  <Copy size={13} /> Copy SVG
                </button>
                <button
                  className="arch-card-btn"
                  onClick={() => handleDownloadSvg(d4Ref, 'SKYNEX-Fleet-Architecture-SIH26054')}
                  title="Download standalone vector SVG"
                >
                  <Download size={13} /> Download SVG
                </button>
              </div>
            </div>

            <div className="arch-card-svg-container">
              <svg
                viewBox="0 0 960 900"
                width="960"
                height="900"
                xmlns="http://www.w3.org/2000/svg"
                style={{ background: '#091218', borderRadius: '10px' }}
              >
                <defs>
                  <style>{`
                    @keyframes commPulse {
                      to { stroke-dashoffset: -20; }
                    }
                    .comm-beam {
                      stroke-dasharray: 4, 3;
                      animation: commPulse 1.2s linear infinite;
                    }
                  `}</style>
                  <linearGradient id="d4-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#152834" />
                    <stop offset="100%" stopColor="#0d1820" />
                  </linearGradient>
                  <marker id="d4-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#63ddbc" />
                  </marker>
                  <pattern id="d4-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff07" strokeWidth="1" />
                  </pattern>
                </defs>

                <rect width="960" height="900" fill="#091218" />
                <rect width="960" height="900" fill="url(#d4-grid)" />
                <rect x="18" y="18" width="924" height="864" rx="12" fill="none" stroke="#63ddbc25" strokeWidth="1.5" />

                {/* Header */}
                <rect x="36" y="36" width="888" height="50" rx="7" fill="#132630" stroke="#63ddbc55" strokeWidth="1" />
                <text x="56" y="66" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="13" fontWeight="bold" letterSpacing="1.5">
                  DISTRIBUTED FLEET PHM & TACTICAL COMMAND ARCHITECTURE
                </text>
                <text x="730" y="66" fill="#8ab6e8" fontFamily="'DM Mono', monospace" fontSize="11">
                  SQUADRON COMMAND
                </text>

                {/* ================= TIER 1: Multiple UAVs (Visual Nodes) ================= */}
                <g transform="translate(45, 105)">
                  <rect x="0" y="0" width="870" height="120" rx="8" fill="url(#d4-grad)" stroke="#63ddbc" strokeWidth="1.3" />
                  <text x="24" y="24" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold">
                    TIER 01 // MULTIPLE UAV ASSETS (TACTICAL SQUADRON)
                  </text>

                  {/* 5 UAV Cards with Vector Airframe Silhouettes */}
                  {[
                    { name: 'VAYU-01', role: 'LEAD STRIKE', health: '95.5%', status: 'READY', col: '#63ddbc' },
                    { name: 'VAYU-02', role: 'NORTH PATROL', health: '91.5%', status: 'ACTIVE', col: '#63ddbc' },
                    { name: 'VAYU-03', role: 'EAST SURVEIL', health: '83.5%', status: 'MONITOR', col: '#e9b969' },
                    { name: 'VAYU-04', role: 'SOUTH RECON', health: '98.5%', status: 'READY', col: '#63ddbc' },
                    { name: 'VAYU-05', role: 'WEST ESCORT', health: '73.5%', status: 'INSPECT', col: '#f47f7d' },
                  ].map((uav, idx) => (
                    <g key={uav.name} transform={`translate(${18 + idx * 168}, 36)`}>
                      <rect x="0" y="0" width="158" height="68" rx="6" fill="#0b171f" stroke="#ffffff16" strokeWidth="1" />
                      {/* UAV Vector Silhouette Icon */}
                      <path d="M 18 20 L 26 34 L 18 30 L 10 34 Z" fill={uav.col} opacity="0.9" />
                      <circle cx="28" cy="20" r="3" fill={uav.col} />
                      <text x="36" y="22" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="bold">{uav.name}</text>
                      <text x="36" y="34" fill="#7a96a0" fontFamily="'DM Mono', monospace" fontSize="7.5">{uav.role}</text>
                      <line x1="12" y1="44" x2="146" y2="44" stroke="#ffffff0a" />
                      <text x="14" y="58" fill="#8fa7b0" fontFamily="'DM Mono', monospace" fontSize="8">HEALTH: <tspan fill={uav.col} fontWeight="bold">{uav.health}</tspan></text>
                      <rect x="96" y="49" width="48" height="13" rx="3" fill={uav.col === '#63ddbc' ? '#112920' : uav.col === '#e9b969' ? '#2e2212' : '#331717'} />
                      <text x="120" y="58" textAnchor="middle" fill={uav.col} fontFamily="'DM Mono', monospace" fontSize="7">{uav.status}</text>
                    </g>
                  ))}
                </g>

                {/* Animated Comm Beams converging down to Fleet Layer */}
                <line x1="140" y1="225" x2="480" y2="280" stroke="#63ddbc" strokeWidth="1.5" className="comm-beam" />
                <line x1="310" y1="225" x2="480" y2="280" stroke="#63ddbc" strokeWidth="1.5" className="comm-beam" />
                <line x1="480" y1="225" x2="480" y2="280" stroke="#e9b969" strokeWidth="1.8" className="comm-beam" />
                <line x1="650" y1="225" x2="480" y2="280" stroke="#63ddbc" strokeWidth="1.5" className="comm-beam" />
                <line x1="820" y1="225" x2="480" y2="280" stroke="#f47f7d" strokeWidth="1.5" className="comm-beam" />

                {/* ================= TIER 2: Fleet Layer ================= */}
                <g transform="translate(140, 282)">
                  <rect x="0" y="0" width="680" height="85" rx="8" fill="url(#d4-grad)" stroke="#52bbbd" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="85" rx="3" fill="#52bbbd" />
                  <text x="24" y="24" fill="#7ed9dc" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold">TIER 02 // FLEET LAYER (DATA AGGREGATION)</text>
                  <text x="24" y="52" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="600">Fleet Data Aggregator</text>
                  <text x="260" y="44" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">• Edge Ingestion Gate & Time Synchronizer</text>
                  <text x="260" y="64" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">• Frame Quality Validation & Companion Aircraft Offset Mapper</text>
                </g>

                <line x1="480" y1="367" x2="480" y2="407" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d4-arrow)" className="comm-beam" />

                {/* ================= TIER 3: PHM Engine Cluster ================= */}
                <g transform="translate(140, 410)">
                  <rect x="0" y="0" width="680" height="85" rx="8" fill="url(#d4-grad)" stroke="#8ab6e8" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="85" rx="3" fill="#8ab6e8" />
                  <text x="24" y="24" fill="#a4c7f0" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold">TIER 03 // PHM ENGINE (PARALLEL DIGITAL TWINS)</text>
                  <text x="24" y="52" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="600">PHM Engine</text>
                  <text x="260" y="44" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">• Concurrent 7-State Thermodynamic ODE Simulators</text>
                  <text x="260" y="64" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">• Real-Time Wear Integration & Deterministic Fault Rules</text>
                </g>

                <line x1="480" y1="495" x2="480" y2="535" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d4-arrow)" className="comm-beam" />

                {/* ================= TIER 4: Analytics Layer ================= */}
                <g transform="translate(140, 538)">
                  <rect x="0" y="0" width="680" height="85" rx="8" fill="url(#d4-grad)" stroke="#aa9ae4" strokeWidth="1.3" />
                  <rect x="0" y="0" width="6" height="85" rx="3" fill="#aa9ae4" />
                  <text x="24" y="24" fill="#c3b8ed" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold">TIER 04 // ANALYTICS LAYER (SQUADRON HEALTH)</text>
                  <text x="24" y="52" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="600">Analytics Layer</text>
                  <text x="260" y="44" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">• Fleet Health Distribution & Hazard Rate Modeling</text>
                  <text x="260" y="64" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">• Squadron Availability Predictions & Cross-Asset Benchmarking</text>
                </g>

                <line x1="480" y1="623" x2="480" y2="663" stroke="#63ddbc" strokeWidth="2.5" markerEnd="url(#d4-arrow)" className="comm-beam" />

                {/* ================= TIER 5: Mission Command Center ================= */}
                <g transform="translate(140, 666)">
                  <rect x="0" y="0" width="680" height="95" rx="8" fill="url(#d4-grad)" stroke="#63ddbc" strokeWidth="1.5" />
                  <rect x="0" y="0" width="6" height="95" rx="3" fill="#63ddbc" />
                  <text x="24" y="24" fill="#8ee7d0" fontFamily="'DM Mono', monospace" fontSize="10" fontWeight="bold">TIER 05 // MISSION COMMAND CENTER</text>
                  <text x="24" y="52" fill="#f0f7f7" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="600">Mission Command Center</text>
                  <text x="24" y="74" fill="#8ba3ad" fontFamily="'DM Mono', monospace" fontSize="10">TACTICAL RADAR & DISPATCH</text>
                  <text x="260" y="44" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">• Tactical Radar Display & Asset Readiness Board</text>
                  <text x="260" y="64" fill="#8ba3ad" fontFamily="Inter, sans-serif" fontSize="11.5">• Automated Maintenance Directives & Flight Clearance Release</text>
                  <text x="260" y="82" fill="#63ddbc" fontFamily="'DM Mono', monospace" fontSize="9.5">STATUS: ALL AIRFRAMES MONITORED // ZERO PACKET LOSS</text>
                </g>

                {/* Footer Stamp */}
                <text x="480" y="830" textAnchor="middle" fill="#5c7987" fontFamily="'DM Mono', monospace" fontSize="10">
                  SKYNEX MULTI-UAV FLEET ARCHITECTURE // CENTRAL DIGITAL TWIN & COMMAND LOGISTICS
                </text>
              </svg>
            </div>

            <div className="arch-card-footer">
              <div>
                <b>Fleet Scalability:</b> Multi-asset architecture capable of supporting concurrent UAV squadrons with isolated twin instances.
              </div>
              <div style={{ font: "700 9px 'DM Mono', monospace", color: '#63ddbc' }}>
                MULTIPLE UAVS ↓ FLEET LAYER ↓ PHM ENGINE ↓ ANALYTICS LAYER ↓ MISSION COMMAND CENTER
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="arch-toast" role="status">
          <CheckCircle2 size={18} color="#63ddbc" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
