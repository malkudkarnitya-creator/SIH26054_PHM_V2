import { ShieldAlert, Wrench } from 'lucide-react'
import { Card, SectionHeading, StatusBadge } from '../components'
import { useMission } from '../hooks/useMission'
import { faultTone, severityTone } from '../lib/status'

const diagnoses = {
  HEALTHY: {
    label: 'NO ACTIVE FAULT',
    confidence: 97,
    action: 'Continue mission and maintain routine telemetry monitoring.',
  },
  COOLING_ISSUE: {
    label: 'COOLING ISSUE',
    confidence: 87,
    action: 'Reduce power and inspect cooling airflow and cylinder head temperatures.',
  },
  ENGINE_DEGRADATION: {
    label: 'ENGINE DEGRADATION',
    confidence: 89,
    action: 'Return to base and inspect engine performance and fuel consumption.',
  },
  BEARING_WEAR: {
    label: 'BEARING WEAR',
    confidence: 91,
    action: 'Reduce power and arrange an inspection of bearings and rotating assemblies.',
  },
  SENSOR_FAULT: {
    label: 'SENSOR FAULT',
    confidence: 84,
    action: 'Cross-check the affected sensor with an independent measurement before action.',
  },
}

export default function Diagnosis() {
  const mission = useMission()
  const diagnosis = diagnoses[mission.faultClassification] ?? diagnoses.HEALTHY
  const severity = mission.health > 85 ? 'LOW' : mission.health >= 60 ? 'HIGH' : 'CRITICAL'

  return (
    <>
      <SectionHeading
        eyebrow="FAULT DIAGNOSIS / LIVE CLASSIFIER"
        title="Fault assessment"
        action={<StatusBadge tone={faultTone(mission.faultClassification)}>{mission.risk} RISK</StatusBadge>}
      />
      <div className="diagnosis-grid">
        <Card className={`fault-hero severity-${severityTone(severity)}`}>
          <ShieldAlert size={34} aria-hidden="true" />
          <span className="eyebrow">DETECTED FAULT</span>
          <h3>{diagnosis.label}</h3>
          <StatusBadge tone={faultTone(mission.faultClassification)}>
            {mission.faultClassification.replaceAll('_', ' ')}
          </StatusBadge>
          <p>
            Current telemetry: {mission.latest.rpm} RPM · EGT {mission.latest.egt}°C ·
            CHT {mission.latest.cht}°C · Fuel {mission.latest.fuel_flow} L/hr ·
            Vibration {mission.latest.vibration} g.
          </p>
        </Card>
        <Card className="diagnosis-detail">
          <SectionHeading eyebrow="MODEL ASSESSMENT" title="Confidence and action" />
          <div className="confidence-score">
            <strong>{diagnosis.confidence}%</strong>
            <span>SIMULATED CLASSIFIER CONFIDENCE</span>
          </div>
          <div
            className="confidence-bar"
            role="progressbar"
            aria-label="Fault classifier confidence"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={diagnosis.confidence}
          >
            <i style={{ width: `${diagnosis.confidence}%` }} />
          </div>
          <div className="diagnosis-action">
            <Wrench size={18} aria-hidden="true" />
            <div>
              <span>RECOMMENDED ACTION · {mission.recommendedAction}</span>
              <p>{diagnosis.action}</p>
            </div>
          </div>
          <p className="analytics-footnote">
            Confidence is a demonstrator estimate, not a calibrated probability or flight-clearance decision.
          </p>
        </Card>
      </div>
    </>
  )
}
