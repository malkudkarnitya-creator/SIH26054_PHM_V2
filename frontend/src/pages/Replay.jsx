import { useCallback, useEffect, useState } from 'react'
import { Pause, Play, RotateCcw, Square } from 'lucide-react'
import { Card, ResourceState, SectionHeading, StatusBadge, TelemetryChart } from '../components'
import { runReplay } from '../api/phmApi'
import { useResource } from '../hooks/useResource'

export default function Replay({ telemetry }) {
  const load = useCallback(() => runReplay(telemetry), [telemetry])
  const { data, error, retry } = useResource(load)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('1x')
  const [index, setIndex] = useState(0)
  const timeline = data?.timeline
  useEffect(() => { setPlaying(false); setIndex(0) }, [timeline])
  useEffect(() => {
    if (!playing || !timeline?.length) return
    if (index >= timeline.length - 1) { setPlaying(false); return }
    const timer = setTimeout(() => setIndex((current) => current + 1), 800 / parseFloat(speed))
    return () => clearTimeout(timer)
  }, [playing, speed, timeline, index])
  if (!timeline) return <ResourceState error={error} retry={retry} label="LOADING REPLAY" />
  function reset() { setPlaying(false); setIndex(0) }
  function togglePlayback() {
    if (index === timeline.length - 1) setIndex(0)
    setPlaying((current) => !current)
  }
  return <><SectionHeading eyebrow="REPLAY CENTER / BACKEND PIPELINE" title="Flight playback" action={<StatusBadge tone="cyan">FRAME {String(index + 1).padStart(2, '0')} / {timeline.length}</StatusBadge>} /><Card><TelemetryChart data={timeline.slice(0, index + 1).map((frame) => ({ ...frame, time: frame.timestamp }))} metric="rpm" title="RPM PLAYBACK" color="#00e5ff" height={330} status="REPLAY" /><div className="replay-controls"><button className="control-button" onClick={togglePlayback}>{playing ? <Pause size={17} /> : <Play size={17} />} {playing ? 'PAUSE' : 'PLAY'}</button><button className="control-button ghost" onClick={reset}><Square size={15} /> STOP</button><button className="control-button ghost" onClick={reset}><RotateCcw size={15} /> RESET</button><div className="speed-group">{['0.25x', '0.5x', '1x', '2x', '4x'].map((item) => <button className={speed === item ? 'active' : ''} key={item} onClick={() => setSpeed(item)}>{item}</button>)}</div></div><input aria-label="Replay frame" className="timeline" type="range" min="0" max={timeline.length - 1} value={index} onChange={(event) => setIndex(Number(event.target.value))} /></Card></>
}
