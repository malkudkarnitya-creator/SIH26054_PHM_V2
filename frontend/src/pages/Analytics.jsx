import { Card, ResourceState, SectionHeading, TelemetryChart } from '../components'
import { getHealthHistory } from '../api/phmApi'
import { useResource } from '../hooks/useResource'

export default function Analytics() {
  const { data: history, error, retry } = useResource(getHealthHistory)
  if (!history) return <ResourceState error={error} retry={retry} label="LOADING TELEMETRY HISTORY" />
  const chart = (key, title, color) => <Card><TelemetryChart data={history[key].map((point) => ({ time: point.timestamp, value: point.value }))} metric="value" title={title} color={color} height={320} status="HISTORY" /></Card>
  return <><SectionHeading eyebrow="TELEMETRY ANALYTICS / DEMO FLIGHT" title="Signal intelligence" /><div className="analytics-grid">{chart('health_history', 'HEALTH TREND', '#4ade80')}{chart('risk_history', 'RISK TREND', '#ff9f43')}{chart('residual_history', 'RESIDUAL TREND', '#00e5ff')}{chart('uncertainty_history', 'UNCERTAINTY TREND', '#a78bfa')}</div></>
}
