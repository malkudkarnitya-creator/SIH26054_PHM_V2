from pathlib import Path

import pandas as pd
import pytest

from uav_health.pipeline import run_pipeline


def _write_csv(tmp_path: Path, **overrides: float) -> Path:
    values: dict[str, object] = {
        "timestamp": "2026-09-10T07:00:00Z",
        "rpm": 3480,
        "egt": 545,
        "cht": 158,
        "fuel_flow": 18.5,
        "throttle": 50,
        "altitude": 1000,
    }
    values.update(overrides)
    path = tmp_path / "telemetry.csv"
    pd.DataFrame([values]).to_csv(path, index=False)
    return path


def test_run_pipeline_healthy_flight(tmp_path: Path) -> None:
    result = run_pipeline(_write_csv(tmp_path))

    assert result["fault_type"] == "HEALTHY"
    assert result["decision"] == "CONTINUE"


def test_run_pipeline_sensor_fault(tmp_path: Path) -> None:
    path = _write_csv(tmp_path, rpm=3100)

    result = run_pipeline(path)

    assert result["fault_type"] == "SENSOR_FAULT"
    assert result["decision"] == "MONITOR"


def test_run_pipeline_cooling_issue(tmp_path: Path) -> None:
    path = _write_csv(tmp_path, cht=185)

    result = run_pipeline(path)

    assert result["fault_type"] == "COOLING_ISSUE"
    assert result["decision"] == "DERATE"


def test_run_pipeline_engine_degradation(tmp_path: Path) -> None:
    path = _write_csv(tmp_path, rpm=3100, egt=620, cht=190)

    result = run_pipeline(path)

    assert result["fault_type"] == "ENGINE_DEGRADATION"
    assert result["decision"] == "DIVERT"


def test_run_pipeline_rejects_invalid_input() -> None:
    with pytest.raises(TypeError, match="csv_file"):
        run_pipeline(123)  # type: ignore[arg-type]
