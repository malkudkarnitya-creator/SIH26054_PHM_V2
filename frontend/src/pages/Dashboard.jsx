import { AlertTriangle, ArrowRight, CircleGauge, Database, FileUp, RotateCcw, Terminal, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, GaugeChart, KpiCard, SectionHeading, StatusBadge, TelemetryChart } from '../components'
import { parseTelemetryCsv } from '../lib/telemetry'
import { faultTone, severityTone, healthTone } from '../lib/status'

export default function Dashboard({ data, analysis, uploadError, analyzing, onTelemetry, onUploadError, onReset }) {
  const s = data.latest
  const { expected, residuals, decision, health_score: health, risk_score: risk, fault_type: fault } = analysis
  const tone = faultTone(fault)
  const variance = expected.rpm ? ((s.rpm - expected.rpm) / expected.rpm * 100).toFixed(1) + '%' : 'N/A'
  async function uploadCsv(event) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Please upload a CSV smaller than 5 MB.')
      await onTelemetry(parseTelemetryCsv(await file.text()))
    } catch (error) {
      onUploadError(error.message || 'Invalid CSV file.')
    } finally { input.value = '' }
  }
  return <><div className="hero"><div><span className="eyebrow">MISSION CONTROL / TELEMETRY OVERVIEW</span><h2>SKYNEX</h2><p>Intelligent UAV Health &amp; Mission Assurance</p></div><div className={`hero-status severity-${severityTone(analysis.severity)}`}><span className="pulse-dot" /> {analysis.severity} SEVERITY <small>LAST SYNC {new Date(data.updatedAt).toLocaleTimeString()}</small></div></div>
    <Card className="upload-card"><div><span className="eyebrow">LIVE BACKEND LINK</span><h3>Analyze a telemetry snapshot</h3><p>Upload a CSV to analyze its latest row. Include timestamp in every row for replay. Required: rpm, egt, cht, throttle (0–100%).</p></div><label className="upload-button"><FileUp size={16} /> {analyzing ? 'ANALYZING…' : 'UPLOAD CSV'}<input aria-label="Upload telemetry CSV" type="file" accept=".csv,text/csv" onChange={uploadCsv} disabled={analyzing} /></label><button className="secondary-button" disabled={analyzing} onClick={onReset}><RotateCcw size={14} /> RESET ESTIMATOR</button></Card>
    {uploadError && <div className="alert-card" role="alert"><AlertTriangle size={18} /><div><b>Telemetry analysis unavailable</b><span>{uploadError}</span></div></div>}
    <Card className="analysis-card"><SectionHeading eyebrow="BACKEND RESPONSE / POST /API/ANALYZE" title="Latest telemetry decision" action={<StatusBadge severity={analysis.severity}>{analysis.severity}</StatusBadge>} /><div className="analysis-grid"><div><small>EXPECTED RPM</small><b>{expected.rpm.toFixed(1)}</b><small>EXPECTED EGT</small><b>{expected.egt.toFixed(1)} °C</b><small>EXPECTED CHT</small><b>{expected.cht.toFixed(1)} °C</b><small>RISK SCORE</small><b>{risk.toFixed(1)}%</b></div><div><small>RESIDUALS · RPM / EGT / CHT</small><b>{residuals.rpm.toFixed(1)} / {residuals.egt.toFixed(1)} / {residuals.cht.toFixed(1)}</b><small>MISSION DECISION</small><b>{decision}</b><small>HEALTH SCORE</small><b className={health >= 80 ? 'text-green' : ''}>{health.toFixed(1)}%</b></div></div></Card>
    <div className="kpi-grid"><KpiCard label="RPM" value={s.rpm.toLocaleString()} unit=" rpm" /><KpiCard label="EGT" value={s.egt} unit=" °C" status="amber" /><KpiCard label="CHT" value={s.cht} unit=" °C" status="purple" /><KpiCard label="HEALTH" value={health} unit="%" status={healthTone(health)} /><KpiCard label="FAULT" value={fault} status={tone} icon={AlertTriangle} /><KpiCard label="DECISION" value={decision.replaceAll('_', ' ')} status={severityTone(analysis.severity)} icon={Zap} /></div>
    <div className="dashboard-grid"><Card className="span-2"><SectionHeading eyebrow="01 / TELEMETRY" title="Engine signatures" action={<StatusBadge tone="cyan">{data.source}</StatusBadge>} /><div className="chart-grid"><TelemetryChart data={data.telemetry} metric="rpm" title="RPM TREND" /><TelemetryChart data={data.telemetry} metric="egt" title="EGT TREND" color="#ff9f43" /></div></Card><Card className="health-card"><SectionHeading eyebrow="02 / DIGITAL TWIN" title="Engine health" /><GaugeChart value={health} /><div className="health-foot"><span>EXPECTED <b>{expected.rpm.toLocaleString()} RPM</b></span><span>VARIANCE <b>{variance}</b></span></div></Card><Card><SectionHeading eyebrow="03 / PIPELINE" title="System telemetry" /><div className="pipeline-list">{[['01', 'MINI DIGITAL TWIN', `Expected RPM: ${expected.rpm}`], ['02', 'EKF ESTIMATOR', `Confidence: ${analysis.confidence}%`], ['03', 'FAULT CLASSIFIER', `${fault} / risk ${risk}%`], ['04', 'MISSION DECISION', decision.replaceAll('_', ' ')]].map(([n, title, detail]) => <div className="pipeline-row" key={n}><span>{n}</span><div><b>{title}</b><small>{detail}</small></div><ArrowRight size={15} /></div>)}</div></Card><Card className="span-2"><SectionHeading eyebrow="04 / ACTIVITY" title="Mission activity" action={<Link className="text-button" to="/analytics">VIEW HISTORY <ArrowRight size={14} /></Link>} /><div className="activity-list"><div><span className={`activity-icon severity-${severityTone(analysis.severity)}`}><CircleGauge size={16} /></span><p><b>{analysis.explanation}</b><small>Latest analysis · {new Date(data.updatedAt).toLocaleTimeString()}</small></p><StatusBadge severity={analysis.severity}>{analysis.severity}</StatusBadge></div><div><span className="activity-icon cyan"><Database size={16} /></span><p><b>Telemetry snapshot loaded</b><small>{data.telemetry.length} samples · latest row analyzed</small></p><StatusBadge tone="cyan">SYNCED</StatusBadge></div><div><span className="activity-icon purple"><Terminal size={16} /></span><p><b>Flight profile loaded</b><small>{data.source}</small></p><StatusBadge tone="purple">READY</StatusBadge></div></div></Card></div>
  </>
}
