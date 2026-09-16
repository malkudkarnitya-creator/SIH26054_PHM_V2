import { ShieldAlert } from 'lucide-react'
import { Card, SectionHeading, StatusBadge } from '../components'
import { severityTone } from '../lib/status'

export default function Diagnosis({ analysis }) {
  return <><SectionHeading eyebrow="FAULT DIAGNOSIS / CLASSIFIER OUTPUT" title="Fault assessment" action={<StatusBadge tone="cyan">ANALYSIS LOADED</StatusBadge>} /><div className="diagnosis-grid"><Card className={`fault-hero severity-${severityTone(analysis.severity)}`}><ShieldAlert size={34} /><span className="eyebrow">DETECTED FAULT</span><h3>{analysis.fault_type}</h3><StatusBadge severity={analysis.severity}>{analysis.severity} SEVERITY</StatusBadge><p>{analysis.explanation}</p></Card><Card><SectionHeading eyebrow="CLASSIFIER CONFIDENCE" title="Confidence breakdown" /><div className="confidence-score"><strong>{analysis.confidence}%</strong><span>BACKEND CONFIDENCE</span></div><div className="confidence-bar"><i style={{ width: `${analysis.confidence}%` }} /></div></Card></div></>
}
