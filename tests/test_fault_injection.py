import pytest

from uav_health.fault_injection import inject_fault


@pytest.fixture
def telemetry() -> dict[str, float]:
    return {"rpm": 2400, "egt": 680, "cht": 155, "throttle": 50}


def test_no_fault_returns_unchanged_copy(telemetry: dict[str, float]) -> None:
    result = inject_fault(telemetry, "NO_FAULT", 100)

    assert result == telemetry
    assert result is not telemetry


def test_injects_rpm_sensor_bias(telemetry: dict[str, float]) -> None:
    assert inject_fault(telemetry, "RPM_SENSOR_BIAS", 100)["rpm"] == 2500


def test_injects_egt_sensor_bias(telemetry: dict[str, float]) -> None:
    assert inject_fault(telemetry, "EGT_SENSOR_BIAS", 25)["egt"] == 705


def test_injects_cht_sensor_bias(telemetry: dict[str, float]) -> None:
    assert inject_fault(telemetry, "CHT_SENSOR_BIAS", 10)["cht"] == 165


def test_injects_engine_degradation(telemetry: dict[str, float]) -> None:
    result = inject_fault(telemetry, "ENGINE_DEGRADATION", 100)

    assert result["rpm"] == 2300
    assert result["egt"] == 780
    assert result["cht"] == 255


def test_injects_cooling_failure(telemetry: dict[str, float]) -> None:
    result = inject_fault(telemetry, "COOLING_FAILURE", 30)

    assert result["rpm"] == telemetry["rpm"]
    assert result["egt"] == telemetry["egt"]
    assert result["cht"] == 185


def test_rejects_invalid_fault_type(telemetry: dict[str, float]) -> None:
    with pytest.raises(ValueError, match="Unsupported fault type"):
        inject_fault(telemetry, "UNKNOWN_FAULT", 10)


def test_rejects_invalid_magnitude(telemetry: dict[str, float]) -> None:
    with pytest.raises(ValueError, match="non-negative"):
        inject_fault(telemetry, "RPM_SENSOR_BIAS", -1)
