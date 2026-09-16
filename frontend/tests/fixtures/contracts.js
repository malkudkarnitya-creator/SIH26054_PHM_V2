export const sample = { timestamp: '2026-09-10T07:27:00Z', rpm: 3566, egt: 560.6, cht: 163.8, throttle: 0.72, altitude: 1200 }
export const samples = [sample, { ...sample, timestamp: '2026-09-10T07:28:00Z', rpm: 3600 }]
export const analysis = {
  health_score: 10.7, risk_score: 89.3, fault_type: 'HEALTHY', severity: 'HIGH', confidence: 68.7,
  decision: 'CONTINUE_MISSION', expected: { rpm: 4576, egt: 588, cht: 175.2 },
  estimated: { rpm: 3566, egt: 560.6, cht: 163.8 }, residuals: { rpm: -1010, egt: -27.4, cht: -11.4 },
  explanation: 'No engine fault detected.',
}
export const validation = { accuracy: .968, precision: .952, recall: .947, f1_score: .949, confusion_matrix: [[128, 3, 0, 1], [2, 42, 1, 0], [0, 1, 38, 2], [1, 0, 2, 35]] }
export const history = Object.fromEntries(['health_history', 'risk_history', 'residual_history', 'uncertainty_history'].map((key) => [key, [{ timestamp: sample.timestamp, value: 0 }]]))
const faults = ['HEALTHY', 'SENSOR_FAULT', 'COOLING_ISSUE', 'ENGINE_DEGRADATION']
const detail = { fault_type: 'ENGINE_DEGRADATION', magnitude: 20, predicted_fault: 'HEALTHY', severity: 'HIGH', decision: 'CONTINUE' }
export const experiment = { metrics: {
  total_experiments: 1, accuracy: 0, precision: Object.fromEntries(faults.map((fault) => [fault, 0])),
  recall: Object.fromEntries(faults.map((fault) => [fault, 0])),
  confusion_matrix: Object.fromEntries(faults.map((fault) => [fault, Object.fromEntries(faults.map((predicted) => [predicted, fault === 'ENGINE_DEGRADATION' && predicted === 'HEALTHY' ? 1 : 0]))])),
  experiment_details: [detail],
}, results: [detail] }
export const makeReplay = (rows = samples) => ({ timeline: rows.map((row) => ({ ...row, health_score: 10.7, risk_score: 89.3, fault: 'HEALTHY', severity: 'HIGH', decision: 'CONTINUE_MISSION', residuals: analysis.residuals, uncertainty: { rpm: 34.375, egt: 16.9, cht: 16.9 } })) })
