import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  baseTelemetry,
  classifyTelemetry,
  createTelemetrySample,
  recommendationForHealth,
  telemetryHealth,
} from '../data/mockData'

const MissionContext = createContext(null)
const MAX_HISTORY_SAMPLES = 600
const injectedFaults = ['COOLING_ISSUE', 'ENGINE_DEGRADATION', 'BEARING_WEAR', 'SENSOR_FAULT']
const faultNames = {
  HEALTHY: 'NO ACTIVE FAULT',
  COOLING_ISSUE: 'COOLING SYSTEM FAULT',
  ENGINE_DEGRADATION: 'ENGINE DEGRADATION',
  BEARING_WEAR: 'BEARING WEAR',
  SENSOR_FAULT: 'SENSOR FAULT',
}

function faultMode(scenario) {
  if (scenario === 'cooling') return 'COOLING_ISSUE'
  if (scenario === 'degradation') return 'ENGINE_DEGRADATION'
  if (scenario === 'bearing') return 'BEARING_WEAR'
  if (scenario === 'sensor') return 'SENSOR_FAULT'
  return null
}

export function MissionProvider({ children }) {
  const [scenario, setScenario] = useState('normal')
  const [telemetry, setTelemetry] = useState(baseTelemetry)
  const sampleIndex = useRef(baseTelemetry.length)
  const autoFault = useRef({ mode: 'HEALTHY', remaining: 0, wait: 5 + Math.floor(Math.random() * 5) })

  useEffect(() => {
    const interval = setInterval(() => {
      const index = sampleIndex.current++
      const forcedFault = faultMode(scenario)
      let currentFault = forcedFault

      if (!currentFault) {
        const state = autoFault.current
        if (state.remaining > 0) {
          currentFault = state.mode
          state.remaining -= 1
        } else if (state.wait > 0) {
          state.wait -= 1
        } else {
          state.mode = injectedFaults[Math.floor(Math.random() * injectedFaults.length)]
          state.remaining = 2 + Math.floor(Math.random() * 4)
          state.wait = 5 + Math.floor(Math.random() * 8)
          currentFault = state.mode
        }
      }

      const point = createTelemetrySample(index, currentFault || 'HEALTHY')
      setTelemetry((current) => [...current.slice(-(MAX_HISTORY_SAMPLES - 1)), point])
    }, 2000)
    return () => clearInterval(interval)
  }, [scenario])

  const value = useMemo(() => {
    const latest = telemetry.at(-1)
    const detectedFault = classifyTelemetry(latest)
    const health = telemetryHealth(latest)
    const rul = Number((health * 0.2).toFixed(1))
    const recommendation = recommendationForHealth(health)
    const risk = health > 85 ? 'LOW' : health >= 60 ? 'HIGH' : 'CRITICAL'
    const mission = recommendation === 'CONTINUE MISSION'
      ? 'IN PROGRESS'
      : recommendation === 'REDUCE POWER'
        ? 'CAUTION'
        : 'RETURN TO BASE'

    return {
      health,
      rul,
      fault: faultNames[detectedFault],
      faultClassification: detectedFault,
      recommendedAction: recommendation,
      risk,
      recommendation,
      mission,
      scenario,
      setScenario,
      telemetry,
      history: telemetry,
      latest,
      rulRange: {
        lower: Number((rul * 0.85).toFixed(1)),
        upper: Number((rul * 1.15).toFixed(1)),
      },
    }
  }, [scenario, telemetry])

  return createElement(MissionContext.Provider, { value }, children)
}

export function useMission() {
  const mission = useContext(MissionContext)
  if (!mission) throw new Error('useMission must be used within MissionProvider.')
  return mission
}
