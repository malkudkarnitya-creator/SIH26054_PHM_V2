import { Component, useId } from 'react'
import { motion } from 'framer-motion'
import { severityTone } from './lib/status'
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Gauge, ShieldAlert, Thermometer, Wind } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function SectionHeading({ eyebrow, title, action }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</div>
}

export function Card({ children, className = '', glow = false }) {
  return <motion.section whileHover={{ y: -2 }} className={`glass-card ${glow ? 'card-glow' : ''} ${className}`}>{children}</motion.section>
}

const icons = { RPM: Wind, EGT: Thermometer, CHT: Thermometer, HEALTH: ShieldAlert, FAULT: ShieldAlert, DECISION: CheckCircle2 }
export function KpiCard({ label, value, unit, trend, status = 'cyan', icon }) {
  const Icon = icon || icons[label] || Gauge
  return <Card className="kpi-card"><div className={`kpi-icon ${status}`}><Icon size={18} /></div><div className="kpi-label">{label}</div><div className="kpi-value" title={String(value)}>{value}<small>{unit}</small></div>{trend && <div className={`kpi-trend ${trend.startsWith('-') ? 'down' : ''}`}>{trend.startsWith('-') ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{trend}</div>}</Card>
}

export function TelemetryChart({ data, metric = 'rpm', title, color = '#00e5ff', height = 270, status = 'SNAPSHOT' }) {
  const points = data.map((point, index) => ({ ...point, time: point.time ?? point.timestamp ?? index + 1 }))
  return <div className="chart-wrap"><div className="chart-title">{title}<span>{status}</span></div>{points.length ? <ResponsiveContainer width="100%" height={height}><LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}><CartesianGrid stroke="#ffffff0c" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#65718d', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#65718d', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#0d1428', border: '1px solid #ffffff1a', borderRadius: 10, color: '#fff' }} /><Line type="monotone" dataKey={metric} stroke={color} strokeWidth={2.5} dot={points.length === 1} activeDot={{ r: 4, fill: color }} /></LineChart></ResponsiveContainer> : <p className="muted">No samples available.</p>}</div>
}

export function GaugeChart({ value }) {
  const gradientId = useId()
  return <div className="gauge-box">
    <svg className="health-gauge" viewBox="0 0 260 160" role="img" aria-label={`Health score: ${value} percent. 0 poor, 50 moderate, 100 healthy.`}>
      <defs><linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#facc15" /><stop offset="100%" stopColor="#22c55e" /></linearGradient></defs>
      <path d="M20 130 A110 110 0 0 1 240 130" fill="none" stroke={`url(#${gradientId})`} strokeWidth="12" />
      <line className="gauge-pointer" x1="45" y1="130" x2="20" y2="130" stroke="#eaf8ff" strokeWidth="3" transform={`rotate(${value * 1.8} 130 130)`} />
      <text x="20" y="155" textAnchor="middle" fill="#ef4444">0</text><text x="130" y="155" textAnchor="middle" fill="#facc15">50</text><text x="240" y="155" textAnchor="middle" fill="#22c55e">100</text>
    </svg>
    <div className="gauge-center"><strong>{value}%</strong><small>HEALTH SCORE</small></div>
  </div>
}

export function StatusBadge({ children, tone = 'green', severity }) {
  const resolvedTone = severity == null ? tone : severityTone(severity)
  return <span className={`status-badge ${resolvedTone}`}><i />{children}</span>
}

export function ResourceState({ error, retry, label }) {
  if (error) return <div className="alert-card" role="alert"><div><b>Data unavailable</b><span>{error}</span></div><button className="secondary-button" onClick={retry}>RETRY</button></div>
  return <div className="boot-screen" role="status">{label}</div>
}

export class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="alert-card" role="alert"><div><b>This page could not be displayed.</b><span>Reload the page to try again.</span></div><button className="secondary-button" onClick={() => window.location.reload()}>RELOAD</button></div>
    return this.props.children
  }
}
