import { RefreshCw, TriangleAlert, Plane, Activity, Wrench } from 'lucide-react'
import FleetCommandCenter from '../v2/FleetCommandCenter'
import { useFleet } from '../v2/useFleet'
import '../v2/v2.css'

function FleetCard({ id, status, health, statusLabel, icon: Icon }) {
  const statusColor = status === 'ACTIVE' ? '#63ddbc' : status === 'STANDBY' ? '#ffb955' : '#ff7b6b'

  return (
    <article
      className="metric-card"
      style={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(135deg, rgba(19, 39, 48, 0.95), rgba(11, 20, 26, 0.95))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'rgba(99, 221, 188, 0.15)',
            border: '1px solid rgba(99, 221, 188, 0.35)',
            color: '#63ddbc',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon size={16} />
        </div>
        <span style={{ font: '700 10px "DM Mono", monospace', letterSpacing: '1px', color: '#88a3ad' }}>
          {id}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ fontSize: '24px', color: '#f0f7f7' }}>{health}</strong>
        <span
          style={{
            font: '600 10px "DM Mono", monospace',
            letterSpacing: '0.5px',
            color: statusColor,
            background: `${statusColor}15`,
            padding: '4px 8px',
            borderRadius: '4px',
            border: `1px solid ${statusColor}40`,
          }}
        >
          {status}
        </span>
      </div>
      <p style={{ fontSize: '12px', color: '#88a3ad', margin: 0 }}>{statusLabel}</p>
    </article>
  )
}

export default function Fleet() {
  const { fleet, error, retry, lastUpdated } = useFleet()

  return (
    <div className="v2 fleet-command-page">
      <section className="panel" style={{ padding: '18px 21px', marginBottom: '20px' }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">FLEET OVERVIEW</span>
            <h2>UAV Fleet Status</h2>
          </div>
        </div>
        <div className="metric-grid" style={{ marginTop: '16px' }}>
          <FleetCard id="UAV-01" status="ACTIVE" health="94%" statusLabel="Mission Ready" icon={Plane} />
          <FleetCard id="UAV-02" status="STANDBY" health="97%" statusLabel="Available" icon={Activity} />
          <FleetCard id="UAV-03" status="MAINTENANCE" health="72%" statusLabel="Inspection Required" icon={Wrench} />
        </div>
      </section>

      {error && fleet && (
        <div className="fleet-refresh-warning" role="status">
          <TriangleAlert size={16} />
          <span>Fleet refresh failed. Showing the last received fleet snapshot. {error}</span>
          <button onClick={retry}><RefreshCw size={13} /> Retry</button>
        </div>
      )}
      {!fleet && error && (
        <div className="fleet-load-error" role="alert">
          <TriangleAlert size={18} />
          <div><b>Fleet picture unavailable</b><span>{error}</span></div>
          <button onClick={retry}><RefreshCw size={14} /> Retry</button>
        </div>
      )}
      <FleetCommandCenter fleet={fleet} lastUpdated={lastUpdated} />
    </div>
  )
}
