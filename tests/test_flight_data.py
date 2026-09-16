from pathlib import Path

import pandas as pd
import pytest

from uav_health.flight_data import (
    REQUIRED_COLUMNS,
    FlightDataLoadError,
    TelemetryValidationError,
    load_telemetry_csv,
    validate_columns,
)


def test_load_telemetry_csv_returns_dataframe(tmp_path: Path) -> None:
    telemetry = pd.DataFrame(
        {
            "timestamp": ["2026-09-09T12:00:00Z"],
            "rpm": [2400],
            "egt": [680],
            "cht": [155],
            "fuel_flow": [18.5],
            "throttle": [72],
            "altitude": [1200],
        }
    )
    csv_path = tmp_path / "telemetry.csv"
    telemetry.to_csv(csv_path, index=False)

    result = load_telemetry_csv(csv_path)

    assert isinstance(result, pd.DataFrame)
    assert list(result.columns) == list(REQUIRED_COLUMNS)
    assert result.loc[0, "rpm"] == 2400


def test_validate_columns_allows_additional_columns() -> None:
    dataframe = pd.DataFrame(columns=[*REQUIRED_COLUMNS, "oil_pressure"])

    assert validate_columns(dataframe) is dataframe


def test_validate_columns_reports_missing_columns() -> None:
    dataframe = pd.DataFrame(columns=["timestamp", "rpm"])

    with pytest.raises(TelemetryValidationError, match="missing required columns"):
        validate_columns(dataframe)


def test_validate_columns_rejects_duplicate_columns() -> None:
    dataframe = pd.DataFrame(
        [[1, 2, 3, 4, 5, 6, 7, 8]],
        columns=[*REQUIRED_COLUMNS, "rpm"],
    )

    with pytest.raises(TelemetryValidationError, match="duplicate columns"):
        validate_columns(dataframe)


def test_load_telemetry_csv_wraps_parse_errors(tmp_path: Path) -> None:
    csv_path = tmp_path / "telemetry.csv"
    csv_path.write_text('"unterminated', encoding="utf-8")

    with pytest.raises(FlightDataLoadError):
        load_telemetry_csv(csv_path)
