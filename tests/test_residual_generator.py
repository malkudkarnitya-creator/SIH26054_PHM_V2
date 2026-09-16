import pytest

from uav_health.residual_generator import calculate_residuals


def test_calculate_residuals_returns_zero_for_matching_values() -> None:
    measured = {"rpm": 2400, "egt": 680, "cht": 155}
    expected = {
        "expected_rpm": 2400,
        "expected_egt": 680,
        "expected_cht": 155,
    }

    assert calculate_residuals(measured, expected) == {
        "rpm_residual": 0.0,
        "egt_residual": 0.0,
        "cht_residual": 0.0,
    }


def test_calculate_residuals_returns_positive_residuals() -> None:
    measured = {"rpm": 2500, "egt": 700, "cht": 160}
    expected = {
        "expected_rpm": 2400,
        "expected_egt": 680,
        "expected_cht": 155,
    }

    assert calculate_residuals(measured, expected) == {
        "rpm_residual": 100.0,
        "egt_residual": 20.0,
        "cht_residual": 5.0,
    }


def test_calculate_residuals_returns_negative_residuals() -> None:
    measured = {"rpm": 2300, "egt": 660, "cht": 150}
    expected = {
        "expected_rpm": 2400,
        "expected_egt": 680,
        "expected_cht": 155,
    }

    assert calculate_residuals(measured, expected) == {
        "rpm_residual": -100.0,
        "egt_residual": -20.0,
        "cht_residual": -5.0,
    }


def test_calculate_residuals_handles_multiple_telemetry_rows() -> None:
    rows = [
        (
            {"rpm": 2400, "egt": 680, "cht": 155},
            {"expected_rpm": 2400, "expected_egt": 680, "expected_cht": 155},
        ),
        (
            {"rpm": 2510, "egt": 690, "cht": 157},
            {"expected_rpm": 2500, "expected_egt": 685, "expected_cht": 156},
        ),
    ]

    results = [calculate_residuals(measured, expected) for measured, expected in rows]

    assert results == [
        {"rpm_residual": 0.0, "egt_residual": 0.0, "cht_residual": 0.0},
        {"rpm_residual": 10.0, "egt_residual": 5.0, "cht_residual": 1.0},
    ]


def test_calculate_residuals_reports_missing_values() -> None:
    with pytest.raises(ValueError, match="Missing required values"):
        calculate_residuals(
            {"rpm": 2400, "egt": 680},
            {"expected_rpm": 2400, "expected_egt": 680, "expected_cht": 155},
        )
