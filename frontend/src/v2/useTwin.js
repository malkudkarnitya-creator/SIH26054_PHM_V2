import { useCallback, useEffect, useRef, useState } from 'react'
import { request, streamURL } from './api'

export function useTwin() {
  const [snapshot, setSnapshot] = useState(null)
  const [history, setHistory] = useState([])
  const [connection, setConnection] = useState('connecting')
  const [error, setError] = useState('')
  const lastSequence = useRef(-1)
  const accept = useCallback(data => {
    if (data.sequence < lastSequence.current) return
    lastSequence.current = data.sequence
    setSnapshot(data)
    if (data.timestamp) setHistory(rows => {
      if (rows.some(row => row.sequence === data.sequence)) return rows
      return [...rows, { timestamp: data.timestamp, sequence: data.sequence, sensors: data.sensors,
        expected: data.expected, health_index: data.health_index,
        reliability_percent: data.mission.reliability_percent, rul_hours: data.rul.hours }].slice(-180)
    })
    setError('')
  }, [])
  useEffect(() => {
    let stopped = false, socket, reconnect, poll, watchdog, lastMessage = Date.now()
    const abort = new AbortController()
    request('/history?limit=180', undefined, abort.signal).then(data => {
      if (!stopped) setHistory(current => [...new Map([...data.history, ...current].map(row => [row.sequence, row])).values()].sort((a,b) => a.sequence - b.sequence).slice(-180))
    }).catch(() => {})
    async function refresh() {
      try {
        const data = await request('/twin', undefined, abort.signal)
        if (!stopped) { accept(data); lastMessage = Date.now(); setConnection(socket?.readyState === 1 ? 'streaming' : 'polling') }
      } catch (err) { if (!stopped) { setConnection('offline'); setError('Telemetry link unavailable. Displayed values are the last received snapshot.'); } }
    }
    function connect() {
      if (stopped) return
      socket = new WebSocket(streamURL())
      socket.onopen = () => { if (!stopped) setConnection('streaming') }
      socket.onmessage = event => {
        if (stopped) return
        try { accept(JSON.parse(event.data)); lastMessage = Date.now(); setConnection('streaming') } catch { setError('Invalid telemetry frame received.') }
      }
      socket.onerror = () => socket.close()
      socket.onclose = () => {
        if (!stopped) { setConnection('reconnecting'); reconnect = setTimeout(connect, 3000) }
      }
    }
    refresh(); connect()
    poll = setInterval(() => { if (socket?.readyState !== 1 || Date.now() - lastMessage > 4000) refresh() }, 2500)
    watchdog = setInterval(() => {
      if (Date.now() - lastMessage > 6000) { setConnection('offline'); setError('Telemetry link is stale. Waiting for a fresh engine snapshot.') }
    }, 1000)
    return () => { stopped = true; abort.abort(); clearTimeout(reconnect); clearInterval(poll); clearInterval(watchdog); socket?.close() }
  }, [accept])
  return { snapshot, history, connection, error, accept }
}
