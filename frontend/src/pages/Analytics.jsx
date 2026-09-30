import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, SectionHeading, TelemetryChart } from '../components'
import { useMission } from '../hooks/useMission'
import { telemetryHealth } from '../data/mockData'

export default function Analytics() {
  const { history } = useMission()
  const samples = useMemo(
    () => history.map((sample) => ({ ...sample, health_score: telemetryHealth(sample) })),
    [history],
  )
  const faultFrequency = useMemo(() => {
    const counts = new Map([
      ['HEALTHY', 0],
      ['COOLING_ISSUE', 0],
      ['ENGINE_DEGRADATION', 0],
      ['BEARING_WEAR', 0],
      ['SENSOR_FAULT', 0],
    ])
    samples.forEach(({ fault_classification }) => {
      if (counts.has(fault_classification)) {
        counts.set(fault_classification, counts.get(fault_classification) + 1)
      }
    })
    return [...counts].map(([fault, count]) => ({ fault: fault.replaceAll('_', ' '), count }))
  }, [samples])

  return (
    <>
      <SectionHeading
        eyebrow="TELEMETRY ANALYTICS / ROLLING HISTORY"
        title="Engine trends"
        action={<span className="mission-state">{samples.length} STORED SAMPLES</span>}
      />
      <div className="analytics-grid">
        <Card><TelemetryChart data={samples} metric="health_score" title="HEALTH SCORE VS TIME" color="#4ade80" height={300} status="HISTORY" /></Card>
        <Card><TelemetryChart data={samples} metric="rpm" title="RPM VS TIME" color="#00e5ff" height={300} status="HISTORY" /></Card>
        <Card><TelemetryChart data={samples} metric="egt" title="EGT VS TIME" color="#ff9f43" height={300} status="HISTORY" /></Card>
        <Card className="fault-frequency-card">
          <div className="chart-wrap">
            <div className="chart-title">FAULT FREQUENCY <span>ROLLING HISTORY</span></div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={faultFrequency} margin={{ top: 12, right: 12, bottom: 18, left: -12 }}>
                <CartesianGrid stroke="#ffffff0c" vertical={false} />
                <XAxis dataKey="fault" tick={{ fill: '#8998b2', fontSize: 9 }} angle={-12} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#65718d', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0d1428', border: '1px solid #ffffff1a', borderRadius: 10, color: '#fff' }} />
                <Bar dataKey="count" name="Samples" fill="#45d7aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="analytics-footnote">Fault counts use the stored rolling telemetry history for this browser session.</p>
        </Card>
      </div>
    </>
  )
}
