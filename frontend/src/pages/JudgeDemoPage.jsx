import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Award,
  Layers,
  Radio,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import JudgeDemo from '../v2/JudgeDemo'
import { useTwin } from '../v2/useTwin'
import { request } from '../v2/api'
import '../v2/v2.css'

export default function JudgeDemoPage() {
  const { snapshot: data, connection, error: twinError, accept } = useTwin()
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function startJudgeDemo(scenario) {
    setBusy(true)
    setErrorMsg('')
    try {
      const next = await request('/demo/reset', { scenario })
      accept(next)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset scenario')
    } finally {
      setBusy(false)
    }
  }

  async function control(patch) {
    if (!data?.controls) return
    setBusy(true)
    setErrorMsg('')
    try {
      const next = await request('/controls', { ...data.controls, ...patch })
      accept(next)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update controls')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="v2 judge-demo-page" style={{ padding: '0 0 40px' }}>
      {/* Top Banner Navigation & Quick Access */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          padding: '12px 18px',
          background: 'linear-gradient(135deg, rgba(20,38,46,0.85), rgba(12,22,28,0.85))',
          border: '1px solid rgba(99,221,188,0.2)',
          borderRadius: '9px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              background: 'rgba(99,221,188,0.15)',
              color: '#63ddbc',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Award size={18} />
          </div>
          <div>
            <b style={{ fontSize: '13px', color: '#eef7f6', display: 'block' }}>
              SIH26054 Evaluator Cockpit
            </b>
            <small style={{ fontSize: '10px', color: '#85a4ad' }}>
              Connected to VAYU-01 Propulsion Digital Twin Engine · {connection.toUpperCase()}
            </small>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/architecture"
            className="v-button"
            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Layers size={14} />
            <span>Architecture Diagrams</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Errors or Notices */}
      {(errorMsg || twinError) && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'rgba(244,127,125,0.12)',
            border: '1px solid rgba(244,127,125,0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '11px',
          }}
        >
          <AlertCircle size={16} />
          <span style={{ flex: '1 1 auto' }}>{errorMsg || twinError}</span>
          <button
            onClick={() => {
              setErrorMsg('')
              startJudgeDemo(data?.controls?.scenario || 'nominal')
            }}
            className="v-button"
            style={{ padding: '4px 10px', minHeight: '28px', fontSize: '10px' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Loading state if initial snapshot is connecting */}
      {!data ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'rgba(15,26,33,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'rgba(99,221,188,0.15)',
              color: '#63ddbc',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Radio size={24} className="pulse" />
          </div>
          <h3 style={{ color: '#edf8f6', margin: '0 0 6px', fontSize: '18px' }}>
            Linking to VAYU-01 Digital Twin Service
          </h3>
          <p style={{ color: '#829da7', fontSize: '12px', maxWidth: '480px', margin: '0 auto 18px' }}>
            Connecting to the Render backend digital twin engine. The evaluation cockpit will synchronize automatically.
          </p>
          <span style={{ font: "700 9px 'DM Mono', monospace", color: '#63ddbc' }}>
            STATUS: {connection.toUpperCase()}
          </span>
        </div>
      ) : (
        <JudgeDemo
          data={data}
          busy={busy}
          onStart={startJudgeDemo}
          onPause={running => control({ running })}
          onRestart={() => startJudgeDemo(data?.controls?.scenario || 'nominal')}
        />
      )}
    </div>
  )
}
