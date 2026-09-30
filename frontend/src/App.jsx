import { Navigate, Route, Routes } from 'react-router-dom'
import { MissionProvider, useMission } from './hooks/useMission'
import { loadMission } from './api/phmApi'
import { ResourceState } from './components'
import CommandLayout from './layouts/CommandLayout'
import { useResource } from './hooks/useResource'
import Analytics from './pages/Analytics'
import Dashboard from './pages/Dashboard'
import Diagnosis from './pages/Diagnosis'
import DigitalTwin from './pages/DigitalTwin'
import Experiments from './pages/Experiments'
import Fleet from './pages/Fleet'
import Health from './pages/Health'
import Replay from './pages/Replay'
import Telemetry from './pages/Telemetry'
import Validation from './pages/Validation'

function DiagnosisRoute() {
  return <Diagnosis />
}

function HealthRoute() {
  const { data, error, retry } = useResource(loadMission)
  if (!data) return <ResourceState error={error} retry={retry} label="LOADING ENGINE HEALTH" />
  return <Health analysis={data.analysis} />
}

function ReplayRoute() {
  const { history } = useMission()
  return <Replay telemetry={history} />
}

export default function App() {
  return (
    <MissionProvider>
      <CommandLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/telemetry" element={<Telemetry />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/digital-twin" element={<DigitalTwin />} />
          <Route path="/replay" element={<ReplayRoute />} />
          <Route path="/diagnosis" element={<DiagnosisRoute />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/health" element={<HealthRoute />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CommandLayout>
    </MissionProvider>
  )
}
