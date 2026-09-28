import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const tooltipStyle = {
  background: '#071827',
  border: '1px solid #2b5069',
  borderRadius: 8,
  color: '#e6f2f8',
}

export function TelemetryChart({ title, data, field, color = '#35b9ff', unit }) {
  const gradientId = `telemetry-${useId().replaceAll(':', '')}`
  const latest = data.at(-1)?.[field]

  return (
    <section className="chart-card">
      <header><span>{title}</span><b>{latest ?? '—'} {unit}</b></header>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop stopColor={color} stopOpacity=".35" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#31506d" vertical={false} />
            <XAxis
              dataKey="time"
              interval={Math.max(0, Math.ceil(data.length / 6) - 1)}
              tick={{ fill: '#7890a9', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis width={42} tick={{ fill: '#7890a9', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: '#95acc0' }}
              formatter={(value) => [`${value} ${unit}`, title]}
            />
            <Area type="monotone" dataKey={field} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function TwinChart({ data, field, expected }) {
  const rows = data.map((sample) => ({ ...sample, expected, actual: sample[field] }))

  return (
    <div className="twin-chart" role="img" aria-label={`Expected and actual ${field} trend`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#31506d" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend verticalAlign="top" height={28} />
          <Line dataKey="expected" name="Nominal reference" stroke="#55a8e8" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line dataKey="actual" name="Measured signal" stroke="#4de0b3" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
