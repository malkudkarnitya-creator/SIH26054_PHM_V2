import { TelemetryChart } from '../components/Charts'
import { useMission } from '../hooks/useMission'
import { Inject } from './Dashboard'

const channels = [
  { title: 'ENGINE RPM', field: 'rpm', unit: 'RPM', color: '#35b9ff' },
  { title: 'EXHAUST GAS TEMPERATURE', field: 'egt', unit: '°C', color: '#ff7b6b' },
  { title: 'CYLINDER HEAD TEMPERATURE', field: 'cht', unit: '°C', color: '#ffb955' },
  { title: 'FUEL FLOW', field: 'fuel_flow', unit: 'L/H', color: '#9b8cff' },
  { title: 'VIBRATION', field: 'vibration', unit: 'mm/s', color: '#45d7aa' },
  { title: 'OIL TEMPERATURE', field: 'oil_temperature', unit: '°C', color: '#f08ac7' },
]

export default function Telemetry() {
  const { telemetry, scenario, latest } = useMission()
  const readings = [
    ['RPM', 'rpm', 'RPM', 0],
    ['EGT', 'egt', '°C', 1],
    ['CHT', 'cht', '°C', 1],
    ['FUEL FLOW', 'fuel_flow', 'L/hr', 2],
    ['VIBRATION', 'vibration', 'g', 3],
  ]

  return (
    <>
      <section className="page-title">
        <div>
          <span className="eyebrow">UAV-01 · STREAMING AT 1 HZ</span>
          <h2>Live Telemetry</h2>
          <p>Continuously updating simulated engine measurements · Refresh every 2 seconds.</p>
        </div>
        <div className="mission-state" role="status"><i /> DATA LINK ACTIVE · {scenario.toUpperCase()}</div>
      </section>
      <div className="telemetry-readout-grid" aria-label="Current telemetry values">
        {readings.map(([label, field, unit, digits]) => (
          <article className="telemetry-readout" key={field}>
            <span>{label}</span>
            <strong>{Number(latest[field]).toFixed(digits)}<small>{unit}</small></strong>
            <small>LIVE SAMPLE</small>
          </article>
        ))}
      </div>
      <div className="telemetry-grid">
        {channels.map((channel) => (
          <TelemetryChart
            key={channel.field}
            {...channel}
            data={telemetry}
          />
        ))}
      </div>
      <Inject />
    </>
  )
}
