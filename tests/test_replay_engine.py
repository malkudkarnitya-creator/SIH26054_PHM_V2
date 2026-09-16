from pathlib import Path

import pandas as pd
import pytest

from uav_health.replay_engine import run_replay


def _write_csv(tmp_path: Path, rows: list[dict[str, object]]) -> Path:
    path = tmp_path / "telemetry.csv"
    pd.DataFrame(rows).to_csv(path, index=False)
    return path


def _healthy_row(timestamp: str = "2026-09-10T07:00:00Z") -> dict[str, object]:
    return {
        "timestamp": timestamp,
        "rpm": 3480,
        "egt": 545,
        "cht": 158,
        "fuel_flow": 18.5,
        "throttle": 50,
        "altitude": 1000,
    }


def test_replay_healthy_flight(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    results = run_replay(_write_csv(tmp_path, [_healthy_row()]))

    assert results[0].fault_type == "HEALTHY"
    assert results[0].decision == "CONTINUE"
    assert "Fault Type: HEALTHY" in capsys.readouterr().out


def test_replay_fault_flight(tmp_path: Path) -> None:
    row = _healthy_row()
    row.update({"rpm": 3100, "egt": 620, "cht": 190})

    results = run_replay(_write_csv(tmp_path, [row]))

    assert results[0].fault_type == "ENGINE_DEGRADATION"
    assert results[0].decision == "DIVERT"


def test_replay_processes_multiple_rows(tmp_path: Path) -> None:
    rows = [_healthy_row(), _healthy_row("2026-09-10T07:00:01Z")]

    results = run_replay(_write_csv(tmp_path, rows))

    assert len(results) == 2
    assert [result.timestamp for result in results] == [
        "2026-09-10T07:00:00Z",
        "2026-09-10T07:00:01Z",
    ]


def test_replay_rejects_invalid_csv(tmp_path: Path) -> None:
    path = tmp_path / "invalid.csv"
    path.write_text("timestamp,rpm\n2026-09-10T07:00:00Z,2400\n", encoding="utf-8")

    with pytest.raises(ValueError, match="missing required columns"):
        run_replay(path)
