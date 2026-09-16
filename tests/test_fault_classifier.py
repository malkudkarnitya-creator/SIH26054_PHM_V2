import pytest

from uav_health.fault_classifier import FaultClassifier


@pytest.fixture
def classifier() -> FaultClassifier:
    return FaultClassifier()


def test_classifies_healthy_residuals(classifier: FaultClassifier) -> None:
    assert classifier.classify_fault(
        {"rpm_residual": 5, "egt_residual": -3, "cht_residual": 2}
    ) == {"fault_type": "HEALTHY", "severity": "LOW"}


def test_classifies_engine_degradation(classifier: FaultClassifier) -> None:
    assert classifier.classify_fault(
        {"rpm_residual": -350, "egt_residual": 75, "cht_residual": 30}
    ) == {"fault_type": "ENGINE_DEGRADATION", "severity": "HIGH"}


def test_classifies_cooling_issue(classifier: FaultClassifier) -> None:
    assert classifier.classify_fault(
        {"rpm_residual": 10, "egt_residual": -15, "cht_residual": 25}
    ) == {"fault_type": "COOLING_ISSUE", "severity": "LOW"}


def test_classifies_sensor_fault(classifier: FaultClassifier) -> None:
    assert classifier.classify_fault(
        {"rpm_residual": -350, "egt_residual": 5, "cht_residual": -10}
    ) == {"fault_type": "SENSOR_FAULT", "severity": "HIGH"}


@pytest.mark.parametrize(
    ("residuals", "severity"),
    [
        ({"rpm_residual": 10, "egt_residual": 10, "cht_residual": 10}, "LOW"),
        ({"rpm_residual": 100, "egt_residual": 100, "cht_residual": 100}, "MEDIUM"),
        ({"rpm_residual": 200, "egt_residual": 100, "cht_residual": 100}, "HIGH"),
    ],
)
def test_assigns_severity_from_total_residual_magnitude(
    classifier: FaultClassifier,
    residuals: dict[str, float],
    severity: str,
) -> None:
    assert classifier.classify_fault(residuals)["severity"] == severity


def test_rejects_missing_residual(classifier: FaultClassifier) -> None:
    with pytest.raises(ValueError, match="missing required fields"):
        classifier.classify_fault({"rpm_residual": 0, "egt_residual": 0})
