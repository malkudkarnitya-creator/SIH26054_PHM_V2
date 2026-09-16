import { useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import {
  Activity, BarChart3, ChevronRight, FlaskConical, Gauge, LayoutDashboard,
  Menu, Plane, Play, Radio, Settings2, ShieldCheck, X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { analyzeTelemetry, loadMission, resetEstimator } from './api/phmApi'
import { useResource } from './hooks/useResource'
import { ErrorBoundary, ResourceState } from './components'
import { severityTone } from './lib/status'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Health from './pages/Health'
import Diagnosis from './pages/Diagnosis'
import Replay from './pages/Replay'
import Validation from './pages/Validation'
import Experiments from './pages/Experiments'

const navItems = [
  { to: '/legacy', label: 'Mission Control', icon: LayoutDashboard },
  { to: '/analytics', label: 'Telemetry Analytics', icon: Activity },
  { to: '/health', label: 'Engine Health', icon: Gauge },
  { to: '/diagnosis', label: 'Fault Diagnosis', icon: ShieldCheck },
  { to: '/replay', label: 'Replay Center', icon: Play },
  { to: '/validation', label: 'Validation', icon: BarChart3 },
  { to: '/experiments', label: 'Experiment Lab', icon: FlaskConical },
]

function Sidebar({ open, onClose, mission }) {
  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><Plane size={20} /></div>
        <div><strong>SKY<span>NEX</span></strong><small>PROPULSION OS</small></div>
        <button className="icon-button mobile-only" aria-label="Close navigation" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="mission-chip"><span className="pulse-dot" /> {mission?.source || 'AWAITING TELEMETRY'}</div>
      <nav>
        <Link to="/" className="v2-return"><Plane size={17} /> V2 Digital Twin <ChevronRight size={14} /></Link><p className="nav-label">COMMAND DECK</p>
        {navItems.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onClose}>
            <Icon size={17} /> {label}<ChevronRight size={14} className="nav-arrow" />
          </NavLink>
        ))}
        <p className="nav-label nav-label-spaced">OPERATIONS</p>
        {navItems.slice(4).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose}>
            <Icon size={17} /> {label}<ChevronRight size={14} className="nav-arrow" />
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className={`system-online severity-${severityTone(mission?.analysis.severity)}`}><span className="pulse-dot" /> {mission ? `SEVERITY: ${mission.analysis.severity}` : 'AWAITING ANALYSIS'}</div>
        <div className="operator"><div className="avatar">NK</div><div><b>Mission Operator</b><small>Ground Station Alpha</small></div><Settings2 size={16} /></div>
      </div>
    </aside>
  )
}

function Header({ onMenu, mission, loading, error }) {
  const location = useLocation()
  const title = navItems.find((item) => item.to === location.pathname)?.label ?? 'Mission Control'
  return <header className="topbar">
    <button className="icon-button mobile-only" aria-label="Open navigation" onClick={onMenu}><Menu size={20} /></button>
    <div><span className="breadcrumb">SKYNEX / OPERATIONS /</span><h1>{title}</h1></div>
    <div className="topbar-actions"><span className="connection"><Radio size={15} /> {loading ? 'CONNECTING' : error ? 'ANALYSIS UNAVAILABLE' : 'SNAPSHOT LOADED'}</span><span className="topbar-time">{mission ? new Date(mission.updatedAt).toLocaleString() : 'AWAITING SYNC'}</span><div className="avatar">NK</div></div>
  </header>
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const resource = useResource(loadMission)
  const [uploadError, setUploadError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const busy = useRef(false)
  const location = useLocation()
  const data = resource.data

  async function handleTelemetry(telemetry) {
    if (busy.current) return
    busy.current = true
    setUploadError('')
    setAnalyzing(true)
    try {
      const latest = telemetry[telemetry.length - 1]
      const analysis = await analyzeTelemetry({ ...latest, reset_filter: true })
      resource.setData({ telemetry, latest, analysis, source: 'UPLOADED CSV', updatedAt: new Date().toISOString() })
    } catch (error) {
      setUploadError(error.message || 'Telemetry analysis failed.')
    } finally {
      busy.current = false
      setAnalyzing(false)
    }
  }

  async function handleReset() {
    if (busy.current) return
    busy.current = true
    setAnalyzing(true)
    setUploadError('')
    try {
      await resetEstimator()
      resource.retry()
    } catch (error) {
      setUploadError(error.message)
    } finally {
      busy.current = false
      setAnalyzing(false)
    }
  }

  const missionPage = (page) => data ? page : <ResourceState error={resource.error} retry={resource.retry} label="INITIALIZING PROPULSION OS" />
  return <div className="app-shell">
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} mission={data} />
    <main className="main-content"><Header onMenu={() => setSidebarOpen(true)} mission={data} loading={resource.loading || analyzing} error={resource.error || uploadError} /><AnimatePresence mode="wait"><motion.div key={location.pathname} className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}><ErrorBoundary key={location.pathname}><Routes>
      <Route path="/legacy" element={missionPage(<Dashboard data={data} analysis={data?.analysis} uploadError={uploadError} analyzing={analyzing} onTelemetry={handleTelemetry} onUploadError={setUploadError} onReset={handleReset} />)} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/health" element={missionPage(<Health analysis={data?.analysis} />)} />
      <Route path="/diagnosis" element={missionPage(<Diagnosis analysis={data?.analysis} />)} />
      <Route path="/replay" element={missionPage(<Replay telemetry={data?.telemetry} />)} />
      <Route path="/validation" element={<Validation />} />
      <Route path="/experiments" element={<Experiments />} />
      <Route path="*" element={<div className="alert-card">Page not found. <Link to="/">Return to Mission Control</Link></div>} />
    </Routes></ErrorBoundary></motion.div></AnimatePresence></main>
  </div>
}

export default App

