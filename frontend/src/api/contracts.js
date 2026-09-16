// Runtime API contracts. CSV parsing and every service use these same field rules.
export const FAULTS = ['HEALTHY', 'SENSOR_FAULT', 'COOLING_ISSUE', 'ENGINE_DEGRADATION']
export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const DECISIONS = ['CONTINUE_MISSION', 'MONITOR', 'REDUCE_POWER', 'RETURN_TO_BASE']
export const EXPERIMENT_FAULTS = ['RPM_SENSOR_BIAS', 'EGT_SENSOR_BIAS', 'CHT_SENSOR_BIAS', 'ENGINE_DEGRADATION', 'COOLING_FAILURE', 'NO_FAULT']
export const TELEMETRY_REQUIRED = ['rpm', 'egt', 'cht', 'throttle']
const optional = ['altitude', 'ambient_temperature', 'health_factor']
const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i
const record = (value) => value != null && typeof value === 'object' && !Array.isArray(value)
const numeric = (value) => typeof value === 'number' && Number.isFinite(value)
const score = (value, max = 100) => numeric(value) && value >= 0 && value <= max
const count = (value) => Number.isInteger(value) && value >= 0
const vector = (value) => record(value) && ['rpm', 'egt', 'cht'].every((key) => numeric(value[key]))
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0

export function isTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate() && Number.isFinite(Date.parse(value))
}

function requireShape(condition, name) {
  if (!condition) throw new Error(`The PHM API returned invalid ${name}.`)
}

export function normalizeTelemetry(row, throttleUnit = 'percent') {
  if (!record(row)) throw new Error('Telemetry must be an object.')
  const result = {}
  for (const key of [...TELEMETRY_REQUIRED, ...optional]) {
    if (!TELEMETRY_REQUIRED.includes(key) && (row[key] == null || row[key] === '')) continue
    const value = row[key]
    if (!(numeric(value) || (typeof value === 'string' && decimal.test(value.trim()) && Number.isFinite(Number(value))))) {
      throw new Error(`Invalid numeric value in telemetry column: ${key}`)
    }
    result[key] = Number(value)
  }
  if (throttleUnit === 'fraction') result.throttle *= 100
  if (!score(result.throttle)) throw new Error('Throttle must be between 0 and 100 percent.')
  if (result.rpm < 0) throw new Error('RPM must not be negative.')
  if (result.health_factor != null && (result.health_factor < 0.5 || result.health_factor > 1)) throw new Error('Health factor must be between 0.5 and 1.')
  if (row.timestamp != null && row.timestamp !== '') {
    if (!isTimestamp(row.timestamp)) throw new Error('timestamp must be a valid ISO date/time with a timezone, for example 2026-09-10T07:27:00Z.')
    result.timestamp = row.timestamp
  }
  if (row.reset_filter != null && row.reset_filter !== '') {
    if (![true, false, 'true', 'false', '1', '0'].includes(row.reset_filter)) throw new Error('reset_filter must be true or false.')
    result.reset_filter = row.reset_filter === true || row.reset_filter === 'true' || row.reset_filter === '1'
  }
  return result
}

export function validateDemo(data) {
  requireShape(Array.isArray(data?.telemetry) && data.telemetry.length > 0
    && data.telemetry.every((row) => record(row) && TELEMETRY_REQUIRED.every((key) => numeric(row[key])) && isTimestamp(row.timestamp)), 'demo telemetry')
  const unit = data.telemetry.every((row) => row.throttle >= 0 && row.throttle <= 1) ? 'fraction' : 'percent'
  return { telemetry: data.telemetry.map((row) => normalizeTelemetry(row, unit)) }
}

export function validateAnalysis(data) {
  requireShape(record(data) && ['health_score', 'risk_score', 'confidence'].every((key) => score(data[key]))
    && FAULTS.includes(data.fault_type) && SEVERITIES.includes(data.severity) && DECISIONS.includes(data.decision)
    && typeof data.explanation === 'string' && vector(data.expected) && vector(data.estimated ?? data.estimated_state) && vector(data.residuals), 'analysis data')
  for (const key of ['innovation', 'uncertainty']) {
    if (data[key] != null) requireShape(vector(data[key]), `analysis ${key}`)
  }
  if (data.covariance_trace != null) requireShape(numeric(data.covariance_trace) && data.covariance_trace >= 0, 'covariance trace')
  return { ...data, estimated: data.estimated ?? data.estimated_state }
}

export function replayPayload(telemetry) {
  if (!Array.isArray(telemetry) || !telemetry.length) throw new Error('Replay requires at least one telemetry sample.')
  if (telemetry.length > 10000) throw new Error('Replay supports up to 10,000 telemetry samples.')
  const rows = telemetry.map((row) => normalizeTelemetry(row))
  if (rows.some((row) => !isTimestamp(row.timestamp))) throw new Error('Replay requires a valid timestamp in every CSV row.')
  if (rows.some((row, index) => index && Date.parse(row.timestamp) <= Date.parse(rows[index - 1].timestamp))) throw new Error('Replay timestamps must be in increasing order.')
  return { telemetry: rows }
}

export function validateReplay(data) {
  requireShape(Array.isArray(data?.timeline) && data.timeline.length > 0 && data.timeline.every((row, index) =>
    record(row) && isTimestamp(row.timestamp) && vector(row) && score(row.health_score) && score(row.risk_score)
    && FAULTS.includes(row.fault) && SEVERITIES.includes(row.severity) && DECISIONS.includes(row.decision)
    && vector(row.residuals) && vector(row.uncertainty)
    && (!index || Date.parse(row.timestamp) > Date.parse(data.timeline[index - 1].timestamp))), 'replay timeline')
  return data
}

export function validateHistory(data) {
  requireShape(record(data) && ['health_history', 'risk_history', 'residual_history', 'uncertainty_history'].every((key) =>
    Array.isArray(data[key]) && data[key].every((point) => record(point) && isTimestamp(point.timestamp) && numeric(point.value)
      && (key === 'health_history' || key === 'risk_history' ? score(point.value) : point.value >= 0))), 'health history')
  return data
}

export function validateValidation(data) {
  requireShape(record(data) && ['accuracy', 'precision', 'recall', 'f1_score'].every((key) => score(data[key], 1))
    && Array.isArray(data.confusion_matrix) && data.confusion_matrix.length === FAULTS.length
    && data.confusion_matrix.every((row) => Array.isArray(row) && row.length === FAULTS.length && row.every(count)), 'validation metrics')
  return data
}

export function experimentPayload(fault_type, magnitude) {
  if (!EXPERIMENT_FAULTS.includes(fault_type) || !score(magnitude)) throw new Error('Choose a supported fault and a magnitude between 0 and 100.')
  return { fault_type, magnitude }
}

export function validateExperiment(data) {
  const detail = (value) => record(value) && EXPERIMENT_FAULTS.includes(value.fault_type) && score(value.magnitude)
    && FAULTS.includes(value.predicted_fault) && SEVERITIES.includes(value.severity) && ['CONTINUE', 'MONITOR', 'DERATE', 'DIVERT'].includes(value.decision)
  const metrics = data?.metrics
  requireShape(record(metrics) && count(metrics.total_experiments) && metrics.total_experiments > 0 && score(metrics.accuracy, 1)
    && ['precision', 'recall'].every((key) => record(metrics[key]) && FAULTS.every((fault) => score(metrics[key][fault], 1)))
    && record(metrics.confusion_matrix) && FAULTS.every((fault) => record(metrics.confusion_matrix[fault]) && FAULTS.every((predicted) => count(metrics.confusion_matrix[fault][predicted])))
    && Array.isArray(metrics.experiment_details) && metrics.experiment_details.length === metrics.total_experiments && metrics.experiment_details.every(detail)
    && Array.isArray(data.results) && data.results.length === metrics.total_experiments && data.results.every(detail), 'experiment results')
  return data
}

export function validateReset(data) {
  requireShape(record(data) && nonempty(data.status), 'reset acknowledgement')
  return data
}
