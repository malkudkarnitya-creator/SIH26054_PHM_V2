import { RefreshCw, TriangleAlert } from 'lucide-react'
import FleetCommandCenter from '../v2/FleetCommandCenter'
import { useFleet } from '../v2/useFleet'
import '../v2/v2.css'

export default function Fleet() {
  const { fleet, error, retry } = useFleet()

  return (
    <div className="v2 fleet-command-page">
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
      <FleetCommandCenter fleet={fleet} />
    </div>
  )
}
