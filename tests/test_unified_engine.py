"""Tests for the unified engine prediction model and stateful EKF enhancements."""

import pytest
from uav_health.physics_model.engine_model import (
    EngineModelInputError,
    UnifiedEngineModel,
    UnifiedEngineState,
    predict_engine_state,
)
from uav_health.ekf import EKFEngineStateEstimator, EKFResult


def test_unified_engine_monotonicity() -> None:
    """Verify that the unified model satisfies all physical UAV propulsion relationships."""
    base = predict_engine_state(throttle=50, altitude=1000, ambient_temperature=25, health_factor=1.0)
    assert base["expected_rpm"] == 3480.0
    assert base["expected_egt"] == 545.0
    assert base["expected_cht"] == 158.0

    # Higher throttle -> RPM, EGT, CHT increase
    higher_thr = predict_engine_state(throttle=70, altitude=1000, ambient_temperature=25, health_factor=1.0)
    assert higher_thr["expected_rpm"] > base["expected_rpm"]
    assert higher_thr["expected_egt"] > base["expected_egt"]
    assert higher_thr["expected_cht"] > base["expected_cht"]

    # Higher altitude -> RPM and temperatures decrease
    higher_alt = predict_engine_state(throttle=50, altitude=3000, ambient_temperature=25, health_factor=1.0)
    assert higher_alt["expected_rpm"] < base["expected_rpm"]
    assert higher_alt["expected_egt"] < base["expected_egt"]
    assert higher_alt["expected_cht"] < base["expected_cht"]

    # Higher ambient temperature -> EGT and CHT increase
    hotter = predict_engine_state(throttle=50, altitude=1000, ambient_temperature=45, health_factor=1.0)
    assert hotter["expected_egt"] > base["expected_egt"]
    assert hotter["expected_cht"] > base["expected_cht"]

    # Degradation -> RPM drops, EGT and CHT increase
    degraded = predict_engine_state(throttle=50, altitude=1000, ambient_temperature=25, health_factor=0.8)
    assert degraded["expected_rpm"] < base["expected_rpm"]
    assert degraded["expected_egt"] > base["expected_egt"]
    assert degraded["expected_cht"] > base["expected_cht"]


def test_unified_engine_input_validation() -> None:
    with pytest.raises(EngineModelInputError):
        UnifiedEngineState(throttle="bad", altitude=0, ambient_temperature=25, health_factor=1.0)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="health_factor"):
        UnifiedEngineState(throttle=50, altitude=0, ambient_temperature=25, health_factor=0.3)


def test_stateful_ekf_temporal_tracking() -> None:
    """Verify that EKF maintains state, innovation, and reduces covariance trace across frames."""
    estimator = EKFEngineStateEstimator(initial_state=[3000, 500, 150])
    initial_trace = estimator.covariance_trace

    # Frame 1
    m1 = {"rpm": 3480, "egt": 545, "cht": 158}
    r1 = estimator.estimate(m1)
    assert isinstance(r1, EKFResult)
    assert r1.covariance_trace < initial_trace
    assert "rpm" in r1.innovation
    assert "rpm" in r1.uncertainty
    assert r1.estimated_state["rpm"] > 3000

    # Frame 2 with measurement persistence
    m2 = {"rpm": 3482, "egt": 546, "cht": 158}
    r2 = estimator.estimate(m2)
    assert r2.covariance_trace <= r1.covariance_trace
    assert estimator.previous_state is not None

    # Test reset
    estimator.reset([0, 0, 0])
    assert estimator.state[0] == 0.0
    assert estimator.previous_state is None
