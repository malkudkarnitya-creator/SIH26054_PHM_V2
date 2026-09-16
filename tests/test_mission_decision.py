import pytest

from uav_health.mission_decision import MissionDecision


@pytest.fixture
def mission_decision() -> MissionDecision:
    return MissionDecision()


def test_healthy_case_continues(mission_decision: MissionDecision) -> None:
    result = mission_decision.decide("HEALTHY", "LOW")

    assert result["decision"] == "CONTINUE"
    assert "No engine fault" in result["reason"]


@pytest.mark.parametrize(
    ("severity", "expected_decision"),
    [("LOW", "CONTINUE"), ("MEDIUM", "MONITOR"), ("HIGH", "MONITOR")],
)
def test_sensor_fault_case(
    mission_decision: MissionDecision,
    severity: str,
    expected_decision: str,
) -> None:
    assert (
        mission_decision.decide("SENSOR_FAULT", severity)["decision"]
        == expected_decision
    )


@pytest.mark.parametrize(
    ("severity", "expected_decision"),
    [("LOW", "DERATE"), ("MEDIUM", "DIVERT"), ("HIGH", "DIVERT")],
)
def test_cooling_issue_case(
    mission_decision: MissionDecision,
    severity: str,
    expected_decision: str,
) -> None:
    assert (
        mission_decision.decide("COOLING_ISSUE", severity)["decision"]
        == expected_decision
    )


@pytest.mark.parametrize(
    ("severity", "expected_decision"),
    [("LOW", "DERATE"), ("MEDIUM", "DIVERT"), ("HIGH", "DIVERT")],
)
def test_engine_degradation_case(
    mission_decision: MissionDecision,
    severity: str,
    expected_decision: str,
) -> None:
    assert (
        mission_decision.decide("ENGINE_DEGRADATION", severity)["decision"]
        == expected_decision
    )


@pytest.mark.parametrize(
    ("fault_type", "severity"),
    [("UNKNOWN", "LOW"), ("HEALTHY", "CRITICAL")],
)
def test_invalid_inputs_raise(
    mission_decision: MissionDecision,
    fault_type: str,
    severity: str,
) -> None:
    with pytest.raises(ValueError, match="Unsupported"):
        mission_decision.decide(fault_type, severity)
