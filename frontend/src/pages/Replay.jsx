import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, RotateCcw, Square } from 'lucide-react'
import { Card, SectionHeading, StatusBadge, TelemetryChart } from '../components'
import { telemetryHealth } from '../data/mockData'

export default function Replay({ telemetry = [] }) {
  const timeline = useMemo(
    () => telemetry.map((sample) => ({
      ...sample,
      time: sample.time ?? sample.timestamp,
      health_score: telemetryHealth(sample),
    })),
    [telemetry],
  )
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('1x')
  const [index, setIndex] = useState(0)
  const previousLength = useMemo(() => timeline.length, [timeline.length])

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, previousLength - 1)))
  }, [previousLength])

  useEffect(() => {
    if (!playing || !timeline.length) return
    if (index >= timeline.length - 1) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => setIndex((current) => current + 1), 800 / parseFloat(speed))
    return () => clearTimeout(timer)
  }, [playing, speed, timeline.length, index])

  if (!timeline.length) return <p className="muted">Waiting for telemetry snapshots.</p>
  function reset() {
    setPlaying(false)
    setIndex(0)
  }
  function togglePlayback() {
    if (index === timeline.length - 1) setIndex(0)
    setPlaying((current) => !current)
  }

  const frame = timeline[index]
  const visibleFrames = timeline.slice(0, index + 1)
  return (
    <>
      <SectionHeading
        eyebrow="REPLAY CENTER / STORED TELEMETRY SNAPSHOTS"
        title="Flight playback"
        action={<StatusBadge tone="cyan">FRAME {String(index + 1).padStart(2, '0')} / {timeline.length}</StatusBadge>}
      />
      <Card>
        <div className="replay-selected-frame">
          <span>{frame.time}</span>
          <b>HEALTH {frame.health_score}%</b>
          <b>RPM {frame.rpm}</b>
          <b>FAULT {frame.fault_classification.replaceAll('_', ' ')}</b>
        </div>
        <div className="replay-chart-grid">
          <TelemetryChart data={visibleFrames} metric="rpm" title="ENGINE RPM" color="#00e5ff" height={230} status="REPLAY" />
          <TelemetryChart data={visibleFrames} metric="egt" title="EXHAUST GAS TEMPERATURE" color="#ff7b6b" height={230} status="REPLAY" />
          <TelemetryChart data={visibleFrames} metric="cht" title="CYLINDER HEAD TEMPERATURE" color="#ffb955" height={230} status="REPLAY" />
          <TelemetryChart data={visibleFrames} metric="health_score" title="ENGINE HEALTH" color="#45d7aa" height={230} status="REPLAY" />
        </div>
        <div className="replay-controls">
          <button className="control-button" onClick={togglePlayback}>{playing ? <Pause size={17} /> : <Play size={17} />} {playing ? 'PAUSE' : 'PLAY'}</button>
          <button className="control-button ghost" onClick={() => setPlaying(false)}><Square size={15} /> STOP</button>
          <button className="control-button ghost" onClick={reset}><RotateCcw size={15} /> RESET</button>
          <div className="speed-group">{['0.25x', '0.5x', '1x', '2x', '4x'].map((item) => <button className={speed === item ? 'active' : ''} key={item} onClick={() => setSpeed(item)}>{item}</button>)}</div>
        </div>
        <input
          aria-label="Replay frame"
          className="timeline"
          type="range"
          min="0"
          max={timeline.length - 1}
          value={index}
          onChange={(event) => {
            setPlaying(false)
            setIndex(Number(event.target.value))
          }}
        />
        <p className="replay-history-note">Snapshots are retained for the current browser session (up to 600 samples).</p>
      </Card>
    </>
  )
}
