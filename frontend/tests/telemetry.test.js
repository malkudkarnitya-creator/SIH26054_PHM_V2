import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTelemetry, parseTelemetryCsv, parseCsvRows } from '../src/lib/telemetry.js'
import { validateAnalysis } from '../src/api/phmApi.js'

const row = { rpm: 3566, egt: 560.6, cht: 163.8, throttle: 72 }

test('CSV preserves timestamps and booleans and ignores unrelated text columns', () => {
  assert.deepEqual(parseTelemetryCsv('\uFEFF"timestamp",rpm,egt,cht,throttle,reset_filter,note\r\n"2026-09-10T07:27:00Z",3566,560.6,163.8,72,false,"note, with comma"\r\n')[0], {
    ...row, timestamp: '2026-09-10T07:27:00Z', reset_filter: false,
  })
})

test('all uploaded rows are retained and validated', () => {
  assert.equal(parseTelemetryCsv('rpm,egt,cht,throttle\n1,2,3,4\n5,6,7,8').length, 2)
  assert.throws(() => parseTelemetryCsv('rpm,egt,cht,throttle\n,2,3,4\n5,6,7,8'), /row 2/)
})

test('empty, missing, malformed, infinite and duplicate values are rejected', () => {
  for (const csv of ['rpm,egt,cht,throttle', 'rpm,egt\n1,2', 'rpm,egt,cht,throttle\n1,2,3', 'rpm,egt,cht,throttle\nInfinity,2,3,4', 'rpm,egt,cht,throttle,rpm\n1,2,3,4,5', 'rpm,egt,cht,throttle\n"1,2,3,4']) {
    assert.throws(() => parseTelemetryCsv(csv))
  }
})

test('fractional demo normalization happens exactly once; one percent stays one percent', () => {
  const normalized = normalizeTelemetry({ ...row, throttle: 0.72 }, 'fraction')
  assert.equal(normalized.throttle, 72)
  assert.equal(normalizeTelemetry(normalized).throttle, 72)
  assert.equal(normalizeTelemetry({ ...row, throttle: 1 }).throttle, 1)
})

test('backend field ranges and types are checked before posting', () => {
  for (const patch of [{ health_factor: 0.1 }, { throttle: 101 }, { rpm: -1 }, { rpm: true }, { reset_filter: 'perhaps' }]) {
    assert.throws(() => normalizeTelemetry({ ...row, ...patch }))
  }
})

test('zero scores are valid and estimated_state alias is normalized', () => {
  const vector = { rpm: 1, egt: 2, cht: 3 }
  const data = { health_score: 0, risk_score: 100, confidence: 0, fault_type: 'SENSOR_FAULT', severity: 'HIGH', decision: 'MONITOR', explanation: '', expected: vector, estimated_state: vector, residuals: vector }
  assert.equal(validateAnalysis(data).health_score, 0)
  assert.deepEqual(validateAnalysis(data).estimated, vector)
  assert.throws(() => validateAnalysis({ ...data, expected: {} }), /invalid analysis/)
  assert.throws(() => validateAnalysis({ ...data, health_score: null }), /invalid analysis/)
})


test('RFC quote grammar rejects balanced malformed and nested quotes without repair', () => {
  for (const value of ['35"66"', '"35"66', '"35" "66"', '"35"x', ' "3566"', '"35""66"']) {
    assert.throws(() => parseTelemetryCsv('rpm,egt,cht,throttle\n' + value + ',560.6,163.8,72'), /CSV/)
  }
})

test('RFC escaped quotes, commas, newlines and spaces are preserved as field data', () => {
  assert.deepEqual(parseCsvRows('"quoted ""text""","a,b","line1\r\nline2", space \r\n'), [['quoted "text"', 'a,b', 'line1\r\nline2', ' space ']])
})

test('numeric fields reject hexadecimal, arrays and malformed dates', () => {
  for (const rpm of ['0x123', [3566], {}, 'NaN', 'Infinity', '-Infinity']) assert.throws(() => normalizeTelemetry({ ...row, rpm }))
  for (const timestamp of ['2026-02-30T07:00:00Z', '2026-09-10T07:00:00', 'yesterday']) assert.throws(() => normalizeTelemetry({ ...row, timestamp }))
})


test('CSV rejects control bytes even inside quoted text fields', () => {
  for (const value of ['"note\u0000"', '"note\t"', 'note\u007f']) assert.throws(() => parseCsvRows(value), /control/)
})
