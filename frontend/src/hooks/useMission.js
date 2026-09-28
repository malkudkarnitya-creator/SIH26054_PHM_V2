import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react'
import { baseTelemetry } from '../data/mockData'

const MissionContext = createContext(null)

const scenarios = {
  normal: {
    health: 94,
    rul: 286,
    fault: 'NO ACTIVE FAULT',
    risk: 'LOW',
    recommendation: 'CONTINUE MISSION',
    mission: 'IN PROGRESS',
  },
  cooling: {
    health: 61,
    rul: 116,
    fault: 'COOLING SYSTEM FAULT',
    risk: 'HIGH',
    recommendation: 'REDUCE POWER',
    mission: 'CAUTION',
  },
  sensor: {
    health: 73,
    rul: 204,
    fault: 'EGT SENSOR ANOMALY',
    risk: 'MEDIUM',
    recommendation: 'RETURN TO BASE',
    mission: 'MONITORING',
  },
  degradation: {
    health: 48,
    rul: 42,
    fault: 'ENGINE DEGRADATION',
    risk: 'CRITICAL',
    recommendation: 'RETURN TO BASE',
    mission: 'ABORT ADVISED',
  },
}

export function MissionProvider({ children }) {
  const [scenario, setScenario] = useState('normal')
  const [telemetry, setTelemetry] = useState(baseTelemetry)

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((current) => [...current.slice(1), nextTelemetryPoint(scenario)])
    }, 1000)
    return () => clearInterval(interval)
  }, [scenario])

  const value = useMemo(() => {
    const current = scenarios[scenario]
    const range = scenario === 'degradation'
      ? { lower: 28, upper: 56 }
      : scenario === 'cooling'
        ? { lower: 88, upper: 144 }
        : scenario === 'sensor'
          ? { lower: 166, upper: 242 }
          : { lower: 243, upper: 329 }

    return {
      ...current,
      scenario,
      setScenario,
      telemetry,
      rulRange: range,
    }
  }, [scenario, telemetry])

  return createElement(MissionContext.Provider, { value }, children)
}

function nextTelemetryPoint(scenario) {
  const rpmDrop = scenario === 'degradation' ? 420 : scenario === 'cooling' ? 160 : 0
  const temperatureRise = scenario === 'cooling' ? 22 : scenario === 'degradation' ? 34 : 0
  const noise = () => Math.round((Math.random() - 0.5) * 20)

  return {
    time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    rpm: 6820 - rpmDrop + noise(),
    cht: 186 + temperatureRise + noise() / 4,
    egt: 642 + temperatureRise + noise() / 2,
    fuel: Number((21.8 + rpmDrop / 700 + Math.random()).toFixed(1)),
    vibration: Number((1.8 + rpmDrop / 350 + Math.random() * 0.25).toFixed(2)),
  }
}

export function useMission() {
  const mission = useContext(MissionContext)
  if (!mission) throw new Error('useMission must be used within MissionProvider.')
  return mission
}
