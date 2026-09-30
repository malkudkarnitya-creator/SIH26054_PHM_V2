const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value))

export function recommendationForHealth(health) {
  if (health > 85) return 'CONTINUE MISSION'
  if (health >= 60) return 'REDUCE POWER'
  return 'RETURN TO BASE'
}

export function classifyTelemetry(sample) {
  if (sample.fault_classification && sample.fault_classification !== 'HEALTHY') {
    return sample.fault_classification
  }
  if (sample.vibration >= 0.32) return 'BEARING_WEAR'
  if (sample.egt >= 710 && sample.cht >= 210) return 'COOLING_ISSUE'
  if (sample.rpm <= 7600 && sample.fuel_flow >= 4.1) return 'ENGINE_DEGRADATION'
  return 'HEALTHY'
}

export function telemetryHealth(sample) {
  const fault = classifyTelemetry(sample)
  const penalties = {
    HEALTHY: 0,
    COOLING_ISSUE: 22,
    ENGINE_DEGRADATION: 34,
    BEARING_WEAR: 34,
    SENSOR_FAULT: 32,
  }
  const deviation = (
    Math.abs(sample.rpm - 8000) / 1000 * 7
    + Math.abs(sample.egt - 650) / 100 * 5
    + Math.abs(sample.cht - 190) / 40 * 4
    + Math.max(0, sample.fuel_flow - 3.4) * 2
    + Math.max(0, sample.vibration - 0.2) * 18
  )
  return Math.round(clamp(96 - deviation - penalties[fault], 0, 100))
}

export function createTelemetrySample(index, fault = 'HEALTHY') {
  const load = clamp(0.5 + 0.11 * Math.sin(index / 17) + 0.04 * Math.sin(index / 4.5), 0.36, 0.68)
  const noise = (magnitude) => (Math.random() - 0.5) * magnitude
  let rpm = 7000 + 2000 * load + noise(90)
  let egt = 550 + 200 * load + noise(18)
  let cht = 150 + 80 * load + noise(8)
  let fuel_flow = 2 + 3 * load + noise(0.3)
  let vibration = 0.05 + 0.3 * load + noise(0.025)
  let oil_temperature = 62 + 38 * load + noise(3)

  if (fault === 'COOLING_ISSUE') {
    egt += 68
    cht += 28
    oil_temperature += 8
  } else if (fault === 'ENGINE_DEGRADATION') {
    rpm -= 800
    fuel_flow += 1.15
  } else if (fault === 'BEARING_WEAR') {
    vibration += 0.16
  } else if (fault === 'SENSOR_FAULT') {
    const sensor = Math.floor(Math.random() * 5)
    if (sensor === 0) rpm += 700
    if (sensor === 1) egt += 55
    if (sensor === 2) cht -= 25
    if (sensor === 3) fuel_flow += 1.1
    if (sensor === 4) vibration += 0.12
  }

  const sample = {
    time: new Date(Date.now() - Math.max(0, 23 - index) * 2000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    timestamp: new Date(Date.now() - Math.max(0, 23 - index) * 2000).toISOString(),
    rpm: Math.round(clamp(rpm, 7000, 9000)),
    egt: Number(clamp(egt, 550, 750).toFixed(1)),
    cht: Number(clamp(cht, 150, 230).toFixed(1)),
    fuel_flow: Number(clamp(fuel_flow, 2, 5).toFixed(2)),
    vibration: Number(clamp(vibration, 0.05, 0.4).toFixed(3)),
    oil_temperature: Number(clamp(oil_temperature, 60, 120).toFixed(1)),
    fault_classification: fault,
  }
  if (fault === 'HEALTHY') sample.fault_classification = classifyTelemetry(sample)
  return sample
}

export const baseTelemetry = Array.from(
  { length: 24 },
  (_, index) => createTelemetrySample(index),
)

export const fleet = [
  { id: 'UAV-01', health: 94, rul: 286, status: 'NOMINAL', fault: 'None detected', mission: 'SURVEILLANCE' },
  { id: 'UAV-02', health: 82, rul: 174, status: 'MONITOR', fault: 'Minor sensor drift', mission: 'MAPPING' },
  { id: 'UAV-03', health: 97, rul: 421, status: 'NOMINAL', fault: 'None detected', mission: 'PATROL' },
]
