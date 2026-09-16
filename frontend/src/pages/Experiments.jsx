import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { Card, SectionHeading } from '../components'
import { runExperiment } from '../api/phmApi'
import { EXPERIMENT_FAULTS } from '../api/contracts'

export default function Experiments() {
  const [running, setRunning] = useState(false)
  const [fault, setFault] = useState('ENGINE_DEGRADATION')
  const [magnitude, setMagnitude] = useState(20)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const busy = useRef(false)
  async function run() {
    if (busy.current) return
    busy.current = true
    setRunning(true)
    setError('')
    setResult(null)
    try { setResult(await runExperiment(fault, magnitude)) }
    catch (error) { setError(error.message || 'Experiment failed.') }
    finally { busy.current = false; setRunning(false) }
  }
  return <><SectionHeading eyebrow="EXPERIMENT LAB / FAULT INJECTION" title="Scenario runner" />{error && <div className="alert-card" role="alert">{error}</div>}<div className="experiment-grid"><Card><SectionHeading eyebrow="NEW SCENARIO" title="Inject a fault" /><label>FAULT TYPE<select value={fault} disabled={running} onChange={(event) => setFault(event.target.value)}>{EXPERIMENT_FAULTS.map((item) => <option key={item}>{item}</option>)}</select></label><label>MAGNITUDE <b className="range-value">{magnitude}</b><input type="range" min="0" max="100" value={magnitude} disabled={running} onChange={(event) => setMagnitude(Number(event.target.value))} /></label><button className="primary-button full" disabled={running} onClick={run}>{running ? 'RUNNING…' : <><Play size={16} /> RUN EXPERIMENT</>}</button></Card><Card className="span-2"><SectionHeading eyebrow="RESULTS / LATEST RUN" title="Experiment result" />{result ? <pre>{JSON.stringify(result, null, 2)}</pre> : <p className="muted">{running ? 'Running experiment…' : 'Run a backend experiment to view metrics and fault detection performance.'}</p>}</Card></div></>
}
