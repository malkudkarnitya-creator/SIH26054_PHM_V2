import test from 'node:test'
import assert from 'node:assert/strict'
import { validateAnalysis, validateDemo, validateHistory, validateValidation, validateReplay, validateExperiment, validateReset, replayPayload } from '../src/api/contracts.js'
import { analysis, samples, history, validation, experiment, makeReplay } from './fixtures/contracts.js'
import { severityTone } from '../src/lib/status.js'

test('every endpoint rejects null and missing envelopes', () => {
  for (const validate of [validateAnalysis, validateDemo, validateHistory, validateValidation, validateReplay, validateExperiment, validateReset]) {
    for (const input of [null, undefined, {}, []]) assert.throws(() => validate(input))
  }
})
test('complete captured contracts are accepted', () => {
  validateAnalysis(analysis); validateDemo({ telemetry: samples }); validateHistory(history)
  validateValidation(validation); validateReplay(makeReplay()); validateExperiment(experiment); validateReset({ status: 'EKF estimator reset' })
})
test('replay guards every rendered field and timestamp order', () => {
  for (const patch of [{ egt: null }, { health_score: NaN }, { risk_score: 101 }, { uncertainty: {} }, { severity: 'UNKNOWN' }, { timestamp: 'bad' }]) {
    const data = makeReplay(); Object.assign(data.timeline[0], patch); assert.throws(() => validateReplay(data))
  }
  assert.throws(() => replayPayload([{ ...samples[0], timestamp: undefined }]), /timestamp/)
  assert.throws(() => replayPayload([...samples].reverse()), /increasing/)
})
test('experiments require full metrics, matrices and results', () => {
  for (const field of ['total_experiments', 'accuracy', 'precision', 'recall', 'confusion_matrix', 'experiment_details']) {
    const data = structuredClone(experiment); delete data.metrics[field]; assert.throws(() => validateExperiment(data))
  }
  assert.throws(() => validateExperiment({ ...experiment, results: [] }))
})
test('severity mapping is independent from any fault classification', () => {
  assert.deepEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(severityTone), ['green', 'yellow', 'orange', 'red'])
  assert.equal(severityTone('UNKNOWN'), 'neutral')
})
