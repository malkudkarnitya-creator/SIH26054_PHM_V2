import { useState } from 'react'
import {
  Activity,
  Boxes,
  ChevronRight,
  CircleDot,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Menu,
  Satellite,
  ShieldCheck,
  X,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

const operations = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/telemetry', 'Telemetry', Activity],
  ['/fleet', 'Fleet', Boxes],
  ['/digital-twin', 'Digital Twin', CircleDot],
  ['/replay', 'Replay', Activity],
  ['/diagnosis', 'Diagnosis', ShieldCheck],
  ['/analytics', 'Analytics', Gauge],
]

const engineering = [
  ['/health', 'Health Analysis', ShieldCheck],
  ['/validation', 'Validation', CircleDot],
  ['/experiments', 'Experiments', FlaskConical],
]

const titles = new Map([...operations, ...engineering].map(([path, label]) => [path, label]))

function NavigationLinks({ links, close }) {
  return links.map(([path, label, Icon]) => (
    <NavLink end={path === '/'} to={path} key={path} onClick={close}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <ChevronRight aria-hidden="true" />
    </NavLink>
  ))
}

export default function CommandLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const closeNavigation = () => setMobileOpen(false)

  return (
    <div className="command-shell">
      {mobileOpen && (
        <button
          className="navigation-backdrop"
          aria-label="Close navigation"
          onClick={closeNavigation}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Mission control navigation">
        <div className="brand">
          <Satellite aria-hidden="true" />
          <div><b>SKYNEX</b><small>AEROSPACE ENGINE COMMAND</small></div>
          <button aria-label="Close navigation" onClick={closeNavigation}><X /></button>
        </div>
        <div className="system-tag"><i /> PROTOTYPE · SYNTHETIC DATA</div>
        <nav aria-label="Mission operations">
          <span className="nav-label">MISSION OPERATIONS</span>
          <NavigationLinks links={operations} close={closeNavigation} />
        </nav>
        <nav className="engineering-nav" aria-label="Engineering tools">
          <span className="nav-label">ENGINEERING TOOLS</span>
          <NavigationLinks links={engineering} close={closeNavigation} />
        </nav>
        <footer><i /> RESEARCH DEMONSTRATOR<small>Not for flight clearance</small></footer>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu /></button>
          <div><span>SKYNEX / UAV OPERATIONS /</span><h1>{titles.get(pathname) || 'Mission Control'}</h1></div>
          <div className="live"><i /> SIMULATION + API <b>IST</b></div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
