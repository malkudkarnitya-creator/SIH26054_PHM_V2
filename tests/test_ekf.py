import numpy as np
import pytest

from uav_health.ekf import EKFEngineStateEstimator


MEASUREMENT = {"rpm": 3500, "egt": 550, "cht": 160}


def test_initialization_uses_identity_matrices_and_defaults() -> None:
    estimator = EKFEngineStateEstimator()

    assert np.array_equal(estimator.F, np.eye(3))
    assert np.array_equal(estimator.H, np.eye(3))
    assert np.diag(estimator.Q).tolist() == [10.0, 10.0, 10.0]
    assert np.diag(estimator.R).tolist() == [50.0, 20.0, 20.0]


def test_predict_preserves_identity_state_and_adds_process_noise() -> None:
    estimator = EKFEngineStateEstimator(initial_state=[1, 2, 3])

    result = estimator.predict()

    assert result["estimated_rpm"] == pytest.approx(1)
    assert estimator.covariance[0, 0] == pytest.approx(110)


def test_update_moves_state_toward_measurement() -> None:
    estimator = EKFEngineStateEstimator(initial_state=[0, 0, 0])
    estimator.predict()

    result = estimator.update(MEASUREMENT)

    assert 0 < result["estimated_rpm"] < MEASUREMENT["rpm"]
    assert 0 < result["estimated_egt"] < MEASUREMENT["egt"]


def test_estimate_runs_predict_and_update() -> None:
    result = EKFEngineStateEstimator(initial_state=list(MEASUREMENT.values())).estimate(
        MEASUREMENT
    )

    assert set(result) == {
        "estimated_rpm",
        "estimated_egt",
        "estimated_cht",
        "rpm_uncertainty",
        "egt_uncertainty",
        "cht_uncertainty",
    }


def test_update_reduces_covariance_after_measurement() -> None:
    estimator = EKFEngineStateEstimator()
    estimator.predict()
    before = np.diag(estimator.covariance).copy()

    estimator.update(MEASUREMENT)

    assert np.all(np.diag(estimator.covariance) < before)


@pytest.mark.parametrize(
    "measurement, error",
    [
        ({"rpm": 1, "egt": 2}, "missing"),
        ({"rpm": "bad", "egt": 2, "cht": 3}, "numeric"),
        ({"rpm": np.nan, "egt": 2, "cht": 3}, "finite"),
        ({"rpm": 1, "egt": 2, "cht": None}, "numeric"),
    ],
)
def test_invalid_measurements_raise_value_error(
    measurement: dict[str, object], error: str
) -> None:
    with pytest.raises(ValueError, match=error):
        EKFEngineStateEstimator().estimate(measurement)
