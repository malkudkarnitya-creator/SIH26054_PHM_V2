import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyTelemetry,
  createTelemetrySample,
  recommendationForHealth,
  telemetryHealth,
} from '../src/data/mockData.js'

test('simulator readings stay in the configured telemetry envelope', () => {
  for (const fault of ['HEALTHY', 'COOLING_ISSUE', 'ENGINE_DEGRADATION', 'BEARING_WEAR', 'SENSOR_FAULT']) {
    for (let index = 0; index < 30; index += 1) {
      const sample = createTelemetrySample(index, fault)
      assert.ok(sample.rpm >= 7000 && sample.rpm <= 9000)
      assert.ok(sample.egt >= 550 && sample.egt <= 750)
      assert.ok(sample.cht >= 150 && sample.cht <= 230)
      assert.ok(sample.fuel_flow >= 2 && sample.fuel_flow <= 5)
      assert.ok(sample.vibration >= 0.05 && sample.vibration <= 0.4)
      assert.ok(telemetryHealth(sample) >= 0 && telemetryHealth(sample) <= 100)
    }
  }
})

test('fault signatures and health scoring reflect injected conditions', () => {
  const normal = createTelemetrySample(14, 'HEALTHY')
  const cooling = createTelemetrySample(14, 'COOLING_ISSUE')
  const degradation = createTelemetrySample(14, 'ENGINE_DEGRADATION')
  const bearing = createTelemetrySample(14, 'BEARING_WEAR')
  const sensor = createTelemetrySample(14, 'SENSOR_FAULT')

  assert.equal(classifyTelemetry(cooling), 'COOLING_ISSUE')
  assert.equal(classifyTelemetry(degradation), 'ENGINE_DEGRADATION')
  assert.equal(classifyTelemetry(bearing), 'BEARING_WEAR')
  assert.equal(classifyTelemetry(sensor), 'SENSOR_FAULT')
  assert.ok(cooling.egt > normal.egt && cooling.cht > normal.cht)
  assert.ok(degradation.rpm < normal.rpm && degradation.fuel_flow > normal.fuel_flow)
  assert.ok(bearing.vibration > normal.vibration)
  assert.ok(telemetryHealth(normal) > telemetryHealth(degradation))
})

test('mission recommendations honor the requested health thresholds', () => {
  assert.equal(recommendationForHealth(85.01), 'CONTINUE MISSION')
  assert.equal(recommendationForHealth(85), 'REDUCE POWER')
  assert.equal(recommendationForHealth(60), 'REDUCE POWER')
  assert.equal(recommendationForHealth(59.99), 'RETURN TO BASE')
})

test('classifier thresholds detect cooling, degradation, and bearing conditions', () => {
  const nominal = {
    fault_classification: 'HEALTHY',
    rpm: 8200,
    egt: 650,
    cht: 190,
    fuel_flow: 3.5,
    vibration: 0.2,
  }

  assert.equal(classifyTelemetry({ ...nominal, egt: 720, cht: 215 }), 'COOLING_ISSUE')
  assert.equal(classifyTelemetry({ ...nominal, rpm: 7400, fuel_flow: 4.5 }), 'ENGINE_DEGRADATION')
  assert.equal(classifyTelemetry({ ...nominal, vibration: 0.35 }), 'BEARING_WEAR')
})
