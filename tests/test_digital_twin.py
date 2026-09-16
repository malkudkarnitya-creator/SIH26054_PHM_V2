import pytest

from uav_health.digital_twin import DigitalTwin, EngineState


def _state(**overrides: float) -> EngineState:
    values = {
        "throttle": 70.0,
        "altitude": 500.0,
        "ambient_temperature": 30.0,
        "health_factor": 1.0,
    }
    values.update(overrides)
    return EngineState(**values)


def test_healthy_engine_predictions() -> None:
    result = DigitalTwin().predict_engine_state(_state())

    assert result == {
        "expected_rpm": 6750.0,
        "expected_egt": 434.0,
        "expected_cht": 176.0,
    }


def test_mild_degradation_reduces_rpm_and_increases_temperatures() -> None:
    twin = DigitalTwin()
    healthy = twin.predict_engine_state(_state())
    mild = twin.predict_engine_state(_state(health_factor=0.9))

    assert mild["expected_rpm"] < healthy["expected_rpm"]
    assert mild["expected_egt"] > healthy["expected_egt"]
    assert mild["expected_cht"] > healthy["expected_cht"]


def test_severe_degradation_changes_more_than_mild() -> None:
    twin = DigitalTwin()
    healthy = twin.predict_engine_state(_state())
    mild = twin.predict_engine_state(_state(health_factor=0.9))
    severe = twin.predict_engine_state(_state(health_factor=0.7))

    assert healthy["expected_rpm"] - severe["expected_rpm"] > (
        healthy["expected_rpm"] - mild["expected_rpm"]
    )
    assert severe["expected_egt"] - healthy["expected_egt"] > (
        mild["expected_egt"] - healthy["expected_egt"]
    )
    assert severe["expected_cht"] - healthy["expected_cht"] > (
        mild["expected_cht"] - healthy["expected_cht"]
    )


def test_high_altitude_reduces_rpm() -> None:
    twin = DigitalTwin()

    assert twin.predict_rpm(_state(altitude=1500)) < twin.predict_rpm(_state())


def test_higher_ambient_temperature_increases_egt_and_cht() -> None:
    twin = DigitalTwin()
    normal = twin.predict_engine_state(_state())
    hot = twin.predict_engine_state(_state(ambient_temperature=50))

    assert hot["expected_egt"] > normal["expected_egt"]
    assert hot["expected_cht"] > normal["expected_cht"]


@pytest.mark.parametrize("health_factor", [0.49, 1.01])
def test_invalid_health_factor_raises(health_factor: float) -> None:
    with pytest.raises(ValueError, match="health_factor"):
        _state(health_factor=health_factor)


def test_predict_engine_state_returns_all_expected_fields() -> None:
    result = DigitalTwin().predict_engine_state(_state())

    assert set(result) == {"expected_rpm", "expected_egt", "expected_cht"}
