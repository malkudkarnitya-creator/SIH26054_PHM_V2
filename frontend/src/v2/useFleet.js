import { useCallback, useEffect, useState } from 'react'
import { request } from './api'

/** Low-rate operational picture; mission telemetry remains on the websocket path. */
export function useFleet() {
  const [fleet, setFleet] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const retry = useCallback(() => setRefreshVersion((current) => current + 1), [])

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const data = await request('/fleet')
        if (active) {
          setFleet(data)
          setLastUpdated(new Date().toISOString())
          setError('')
        }
      }
      catch (failure) {
        if (active) {
          setError(failure instanceof Error ? failure.message : 'Fleet picture unavailable.')
        }
      }
    }
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => { active = false; clearInterval(interval) }
  }, [refreshVersion])

  return { fleet, error, retry, lastUpdated }
}
