import pytest

from uav_health.experiment_runner import ExperimentInputError, run_experiments


@pytest.fixture
def healthy_telemetry() -> dict[str, float]:
    return {
        "rpm": 3480,
        "egt": 545,
        "cht": 158,
        "throttle": 50,
        "altitude": 1000,
    }


def test_perfect_classification(healthy_telemetry: dict[str, float]) -> None:
    result = run_experiments(
        healthy_telemetry,
        [
            ("NO_FAULT", 0),
            ("COOLING_FAILURE", 30),
            ("CHT_SENSOR_BIAS", 30),
            ("ENGINE_DEGRADATION", 400),
        ],
    )

    assert result["total_experiments"] == 4
    assert result["accuracy"] == 1.0
    assert [detail["predicted_fault"] for detail in result["experiment_details"]] == [
        "HEALTHY",
        "COOLING_ISSUE",
        "COOLING_ISSUE",
        "ENGINE_DEGRADATION",
    ]


def test_mixed_classification(healthy_telemetry: dict[str, float]) -> None:
    result = run_experiments(
        healthy_telemetry,
        [("NO_FAULT", 0), ("RPM_SENSOR_BIAS", 10)],
    )

    assert result["accuracy"] == 0.5
    assert result["experiment_details"][1]["predicted_fault"] == "HEALTHY"


def test_multiple_fault_types_include_details(
    healthy_telemetry: dict[str, float],
) -> None:
    result = run_experiments(
        healthy_telemetry,
        [("RPM_SENSOR_BIAS", 400), ("COOLING_FAILURE", 30)],
    )

    assert len(result["experiment_details"]) == 2
    assert result["experiment_details"][0]["decision"] == "CONTINUE"
    assert result["experiment_details"][1]["decision"] == "DERATE"


def test_invalid_fault_type_raises(healthy_telemetry: dict[str, float]) -> None:
    with pytest.raises(ExperimentInputError, match="Unsupported fault type"):
        run_experiments(healthy_telemetry, [("UNKNOWN_FAULT", 10)])


def test_empty_experiment_list_raises(
    healthy_telemetry: dict[str, float],
) -> None:
    with pytest.raises(ExperimentInputError, match="must not be empty"):
        run_experiments(healthy_telemetry, [])
