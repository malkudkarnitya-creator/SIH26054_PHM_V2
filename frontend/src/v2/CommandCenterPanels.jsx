import { useMemo } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, FileText, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const chartTooltip = { background: '#14232d', border: '1px solid #354a55', borderRadius: 8, fontSize: 11, color: '#e6f1f3' }
const fmt = (value, digits = 1) => Number(value || 0).toFixed(digits)
function MiniGauge({ value, label, tone = 'green' }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0))
  return <div className={`animated-gauge ${tone}`}><svg viewBox="0 0 120 120"><circle className="gauge-track" cx="60" cy="60" r="48" /><motion.circle className="gauge-value" cx="60" cy="60" r="48" pathLength="100" initial={{ strokeDasharray: '0 100' }} animate={{ strokeDasharray: `${safe} 100` }} /></svg><strong>{safe.toFixed(0)}<small>%</small></strong><span>{label}</span></div>
}

export function ExplainabilityCenter({ data }) {
  const features = data.explainability.features.slice(0, 5)
  const maxPenalty = Math.max(1, ...features.map((item) => item.penalty))
  const fault = data.maintenance.find((item) => item.priority !== 'routine') || data.maintenance[0]
  return <section className="v-panel explainability-center" id="explainability">
    <div className="v-panel-head"><div><span className="v-eyebrow">AI EXPLAINABILITY CENTER / PHYSICS + RULES</span><h3><Sparkles size={16} /> Why the model thinks this</h3></div><span className="v-badge purple">HUMAN-READABLE</span></div>
    <div className="explainability-layout"><div className="explainability-verdict"><AlertTriangle size={22} /><strong>{fault?.failure_mode || 'HEALTHY OPERATING STATE'}</strong><span>Confidence support</span><b>{fmt(data.explainability.confidence_percent, 0)}%</b><p>{fault?.reason || 'No monitored fault rule is currently active.'}</p></div><div className="contribution-list"><span className="v-muted">Most important parameters</span>{features.map((item, index) => <motion.div className="contribution-row" key={item.key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .06 }}><div><b>{item.label}</b><small>{item.residual >= 0 ? '+' : ''}{fmt(item.residual)} {item.unit} residual</small></div><div className="contribution-track"><i style={{ width: `${Math.min(100, item.penalty / maxPenalty * 100)}%` }} /></div><strong>{fmt(item.penalty, 0)}%</strong></motion.div>)}</div></div>
    <div className="reasoning-strip"><span><CheckCircle2 size={14} /> REASONING CHAIN</span>{data.explainability.reasoning.slice(0, 3).map((reason) => <p key={reason}>{reason}</p>)}</div>
  </section>
}

export function MaintenanceRecommendations({ data }) {
  const recommendations = data.maintenance.filter((item) => item.priority !== 'routine').slice(0, 3)
  const items = recommendations.length ? recommendations : data.maintenance.slice(0, 1)
  return <section className="v-panel maintenance-recommendations" id="maintenance-recommendations">
    <div className="v-panel-head"><div><span className="v-eyebrow">PREDICTIVE MAINTENANCE / SERVICE PLANNING</span><h3><Wrench size={16} /> Maintenance recommendations</h3></div><span className="v-badge amber">{items.length} ACTION{items.length === 1 ? '' : 'S'}</span></div>
    <div className="maintenance-cards">{items.map((item) => <motion.article className={`maintenance-card ${item.priority}`} key={item.id} whileHover={{ y: -3 }}><div className="maintenance-card-top"><span className="v-badge">{item.priority.toUpperCase()}</span><CalendarClock size={16} /></div><h4>{item.failure_mode}</h4><p>{item.recommended_action}</p><div className="maintenance-card-bottom"><span><Clock3 size={12} /> Inspect within {fmt(item.estimated_hours, 1)} hrs</span><b>{item.priority === 'critical' ? 'GROUND ACTION' : 'SCHEDULED'}</b></div></motion.article>)}</div>
    <div className="maintenance-summary"><span>Estimated remaining life</span><strong>{fmt(data.rul.hours, 0)} hrs</strong><small>Recommended inspection date: {new Date(Date.now() + data.rul.hours * 3600 * 1000).toLocaleDateString('en-GB')}</small></div>
  </section>
}

export function MissionTimeline({ data, history }) {
  const labels = ['TAKEOFF', 'CLIMB', 'CRUISE', data.health_index < 80 ? 'FAULT EVENT' : 'HEALTH CHECK', data.mission.decision === 'WITHIN DEMO ENVELOPE' ? 'MISSION DECISION' : 'WARNING EVENT', 'LANDING']
  return <section className="v-panel mission-timeline-panel" id="mission-timeline">
    <div className="v-panel-head"><div><span className="v-eyebrow">MISSION DATA RECORDER / EVENT SEQUENCE</span><h3><Clock3 size={16} /> Mission timeline</h3></div><span className="v-muted">{history.length} RECORDED SAMPLES</span></div>
    <div className="mission-timeline">{labels.map((label, index) => <motion.div className={`mission-phase ${label.includes('FAULT') || label.includes('WARNING') ? 'alert' : ''}`} key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .08 }}><span className="phase-dot" /><b>{label}</b><small>{index === labels.length - 1 ? 'PROJECTED' : index === labels.length - 2 ? data.mission.decision : `${Math.round(index * 18 + 4)} min`}</small></motion.div>)}</div>
  </section>
}

export function AdvancedAnalytics({ data, history }) {
  const chart = useMemo(() => history.map((row, index) => ({ time: row.timestamp, index: index + 1, health: row.health_index, rul: row.rul_hours, reliability: row.reliability_percent, fault: Math.max(0, 100 - row.health_index), degradation: row.wear_percent || (100 - row.rul_hours / Math.max(1, data.rul.upper_hours) * 100) })), [data.rul.upper_hours, history])
  return <section className="v-panel advanced-analytics" id="advanced-analytics">
    <div className="v-panel-head"><div><span className="v-eyebrow">ADVANCED ANALYTICS / PREDICTIVE HEALTH</span><h3><FileText size={16} /> Condition trends</h3></div><span className="v-badge blue">RECHARTS / LIVE WINDOW</span></div>
    <div className="analytics-mini-grid">{[['health', 'HEALTH TREND', '#63ddbc'], ['rul', 'RUL TREND', '#8ab6e8'], ['reliability', 'RELIABILITY TREND', '#aa9ae4'], ['fault', 'FAULT PROBABILITY', '#e9b969'], ['degradation', 'DEGRADATION', '#f47f7d']].map(([key, title, color]) => <div className="analytics-mini-chart" key={key}><span>{title}</span><ResponsiveContainer width="100%" height={150}><LineChart data={chart}><CartesianGrid vertical={false} stroke="#ffffff09" /><XAxis dataKey="index" hide /><YAxis hide domain={['auto', 'auto']} /><Tooltip contentStyle={chartTooltip} labelFormatter={(value) => `Sample ${value}`} formatter={(value) => [fmt(value), title]} /><Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} isAnimationActive /></LineChart></ResponsiveContainer></div>)}</div>
    <div className="mtbf-card"><ShieldCheck size={18} /><div><span>MTBF ESTIMATION</span><strong>{fmt(Math.max(1, data.rul.hours * 1.8), 0)} hrs</strong><small>Condition-based demonstrator estimate from current wear rate</small></div><MiniGauge value={data.mission.reliability_percent} label="Reliability" tone="blue" /></div>
  </section>
}
