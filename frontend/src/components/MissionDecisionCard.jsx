import { AlertTriangle, CheckCircle2, ShieldAlert, TrendingDown, Activity } from 'lucide-react'

/**
 * Autonomous Mission Decision Engine
 * Transforms health metrics into operational mission decisions for UAV operators
 */
export default function MissionDecisionCard({ health, rul, fault, faultClassification }) {
  // Calculate severity from health score (inverse relationship)
  const severity = Math.max(0, 100 - health)

  // Decision Logic
  let decision = 'CONTINUE MISSION'
  let status = 'Safe'
  let statusColor = 'green'
  let riskLevel = 'LOW'
  let riskEmoji = '🟢'

  if (health < 40 || severity > 75 || rul < 10) {
    decision = 'RETURN TO BASE'
    status = 'Critical'
    statusColor = 'red'
    riskLevel = 'HIGH'
    riskEmoji = '🔴'
  } else if (health < 70 || severity > 40 || rul < 30) {
    decision = 'REDUCE POWER'
    status = 'Warning'
    statusColor = 'amber'
    riskLevel = 'MEDIUM'
    riskEmoji = '🟡'
  }

  // Generate recommendation text based on decision
  const getRecommendationText = () => {
    switch (decision) {
      case 'RETURN TO BASE':
        return 'End mission immediately and arrange engine inspection. Critical threshold exceeded.'
      case 'REDUCE POWER':
        return 'Reduce engine load and monitor cylinder-head and exhaust temperatures. Schedule maintenance.'
      default:
        return 'Proceed within the simulated operating envelope and continue routine monitoring.'
    }
  }

  // Get icon based on status
  const getStatusIcon = () => {
    switch (statusColor) {
      case 'red':
        return ShieldAlert
      case 'amber':
        return AlertTriangle
      default:
        return CheckCircle2
    }
  }

  const StatusIcon = getStatusIcon()

  return (
    <section className={`mission-decision-card ${statusColor}`} aria-label="Autonomous mission decision">
      {/* Header */}
      <div className="decision-header">
        <div className="decision-eyebrow">
          <Activity size={12} />
          <span>AUTONOMOUS MISSION DECISION ENGINE</span>
        </div>
        <div className="decision-title">
          <h3>Mission Decision</h3>
        </div>
      </div>

      {/* Decision Status */}
      <div className={`decision-status ${statusColor}`}>
        <div className="decision-icon">
          <StatusIcon size={32} />
        </div>
        <div className="decision-text">
          <span className="decision-label">DECISION</span>
          <strong className="decision-value">{decision}</strong>
          <span className="decision-status-text">{status}</span>
        </div>
      </div>

      {/* Risk Indicator */}
      <div className="risk-indicator">
        <span className="risk-label">MISSION RISK</span>
        <div className={`risk-badge ${statusColor}`}>
          <span className="risk-emoji">{riskEmoji}</span>
          <span className="risk-text">{riskLevel} RISK</span>
        </div>
      </div>

      {/* Explainable AI Section */}
      <div className="decision-reasoning">
        <div className="reasoning-header">
          <span className="reasoning-label">DECISION REASONING</span>
        </div>
        <div className="reasoning-metrics">
          <div className="reasoning-metric">
            <span className="metric-label">Health Score</span>
            <strong className="metric-value">{health.toFixed(1)}%</strong>
          </div>
          <div className="reasoning-metric">
            <span className="metric-label">Fault Severity</span>
            <strong className="metric-value">{severity.toFixed(1)}%</strong>
          </div>
          <div className="reasoning-metric">
            <span className="metric-label">RUL Remaining</span>
            <strong className="metric-value">{rul.toFixed(1)} hrs</strong>
          </div>
          <div className="reasoning-metric">
            <span className="metric-label">Fault</span>
            <strong className="metric-value">{fault || 'None detected'}</strong>
          </div>
        </div>
        <div className="reasoning-recommendation">
          <span className="rec-label">Generated Recommendation:</span>
          <p className="rec-text">{getRecommendationText()}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="decision-footer">
        <span className="footer-label">SKYNEX PHM · OPERATIONAL DECISION SUPPORT</span>
        <span className="footer-status">LIVE TELEMETRY</span>
      </div>
    </section>
  )
}
