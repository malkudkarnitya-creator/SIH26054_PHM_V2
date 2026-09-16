import { Card, ResourceState, SectionHeading } from '../components'
import { getValidationMetrics } from '../api/phmApi'
import { useResource } from '../hooks/useResource'

export default function Validation() {
  const { data, error, retry } = useResource(getValidationMetrics)
  if (!data) return <ResourceState error={error} retry={retry} label="LOADING VALIDATION" />
  const metrics = [['ACCURACY', data.accuracy], ['PRECISION', data.precision], ['RECALL', data.recall], ['F1 SCORE', data.f1_score]]
  return <><SectionHeading eyebrow="VALIDATION METRICS / MODEL PERFORMANCE" title="Confidence in the classifier" /><div className="metric-grid">{metrics.map(([label, value]) => <Card key={label}><span className="eyebrow">{label}</span><strong className="metric-large">{(value * 100).toFixed(1)}%</strong></Card>)}</div><Card className="matrix-card"><SectionHeading eyebrow="CONFUSION MATRIX" title="Classification performance" /><table aria-label="Confusion matrix"><tbody>{data.confusion_matrix.map((row, i) => <tr key={i}>{row.map((cell, j) => <td className={j === i ? 'matrix-best' : ''} key={j}>{cell}</td>)}</tr>)}</tbody></table></Card></>
}
