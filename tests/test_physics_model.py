import pytest

from uav_health.physics_model import SimplePhysicsModel
from uav_health.physics_model.model import PhysicsModelInputError


@pytest.fixture
def model() -> SimplePhysicsModel:
    return SimplePhysicsModel()


def test_predict_returns_expected_values(model: SimplePhysicsModel) -> None:
    telemetry = {
        "throttle": 50,
        "altitude": 1000,
        "rpm": 2400,
        "egt": 680,
        "cht": 155,
    }

    result = model.predict(telemetry)

    assert result == {
        "expected_rpm": 3480.0,
        "expected_egt": 545.0,
        "expected_cht": 158.0,
    }


def test_predict_handles_zero_throttle(model: SimplePhysicsModel) -> None:
    telemetry = {
        "throttle": 0,
        "altitude": 0,
        "rpm": 1000,
        "egt": 450,
        "cht": 120,
    }

    assert model.predict(telemetry) == {
        "expected_rpm": 1000.0,
        "expected_egt": 450.0,
        "expected_cht": 120.0,
    }


def test_predict_handles_high_altitude(model: SimplePhysicsModel) -> None:
    telemetry = {
        "throttle": 80,
        "altitude": 10000,
        "rpm": 0,
        "egt": 0,
        "cht": 0,
    }

    assert model.predict(telemetry) == {
        "expected_rpm": 4800.0,
        "expected_egt": 560.0,
        "expected_cht": 164.0,
    }


def test_predict_reports_missing_fields(model: SimplePhysicsModel) -> None:
    telemetry = {
        "throttle": 50,
        "altitude": 1000,
        "rpm": 2400,
        "egt": 680,
    }

    with pytest.raises(PhysicsModelInputError, match="missing required fields"):
        model.predict(telemetry)
