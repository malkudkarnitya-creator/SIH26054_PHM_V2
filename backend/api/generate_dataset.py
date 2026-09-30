"""Generate a reproducible synthetic UAV aero-piston telemetry dataset."""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "telemetry_dataset.csv"
MINIMUM_ROWS = 50_000
FAULT_TYPES = (
    "Cooling_Issue",
    "Sensor_Fault",
    "Fuel_System_Fault",
    "Engine_Degradation",
)


def generate_dataset(
    rows: int = MINIMUM_ROWS,
    seed: int = 2026,
    output_path: Path = DATASET_PATH,
) -> pd.DataFrame:
    """Generate correlated engine readings and inject faults into 10% of rows."""
    if rows < MINIMUM_ROWS:
        raise ValueError(f"rows must be at least {MINIMUM_ROWS:,}")

    rng = np.random.default_rng(seed)
    time = np.arange(rows, dtype=float)

    # Slowly changing load and autocorrelated noise create plausible flight phases.
    load_cycle = 0.53 + 0.25 * np.sin(time / 1900) + 0.10 * np.sin(time / 317)
    load = np.clip(load_cycle + rng.normal(0, 0.045, rows), 0, 1)
    rpm = 1800 + 1000 * load + rng.normal(0, 24, rows)

    # Thermal readings respond to engine load, with slower CHT variation.
    egt = 500 + 350 * load + 14 * np.sin(time / 73) + rng.normal(0, 9, rows)
    cht = (
        120
        + 130 * load
        + 8 * np.sin(time / 520)
        + rng.normal(0, 4, rows)
    )
    fuel_flow = 15 + 25 * load + 1.1 * np.sin(time / 91) + rng.normal(0, 0.7, rows)

    # Vibration normally rises with load and receives small random variation.
    vibration = (
        0.5
        + 2.0 * load
        + 0.8 * load**2
        + 0.16 * np.sin(time / 37)
        + rng.normal(0, 0.12, rows)
    )

    fault_type = np.full(rows, "None", dtype=object)
    fault_count = round(rows * 0.10)
    fault_indices = rng.choice(rows, size=fault_count, replace=False)
    fault_type[fault_indices] = rng.choice(FAULT_TYPES, size=fault_count)

    # Apply fault signatures to measured engine parameters before scoring health.
    cooling = fault_type == "Cooling_Issue"
    cht[cooling] += rng.uniform(18, 38, cooling.sum())
    egt[cooling] += rng.uniform(5, 22, cooling.sum())

    sensor = fault_type == "Sensor_Fault"
    sensor_rows = np.flatnonzero(sensor)
    sensor_choice = rng.integers(0, 5, size=sensor_rows.size)
    for measurement, column in enumerate(
        (rpm, cht, egt, fuel_flow, vibration)
    ):
        selected = sensor_rows[sensor_choice == measurement]
        column[selected] += rng.normal(0, 1, selected.size) * (
            30 if measurement < 3 else 2
        )

    fuel_fault = fault_type == "Fuel_System_Fault"
    fuel_flow[fuel_fault] -= rng.uniform(3, 9, fuel_fault.sum())

    degradation = fault_type == "Engine_Degradation"
    vibration[degradation] += rng.uniform(1.2, 2.7, degradation.sum())
    egt[degradation] += rng.uniform(12, 35, degradation.sum())

    # Clamp sensor outputs to the specified operating envelope.
    rpm = np.clip(rpm, 1800, 2800)
    cht = np.clip(cht, 120, 250)
    egt = np.clip(egt, 500, 850)
    fuel_flow = np.clip(fuel_flow, 15, 40)
    vibration = np.clip(vibration, 0.5, 6.0)

    # Health degrades with temperature and vibration, with additional fault penalties.
    health_score = (
        100
        - 16 * ((cht - 120) / 130)
        - 15 * ((egt - 500) / 350)
        - 30 * ((vibration - 0.5) / 5.5)
    )
    health_score[cooling] -= 9
    health_score[sensor] -= 5
    health_score[fuel_fault] -= 8
    health_score[degradation] -= 15
    health_score = np.clip(health_score, 0, 100)

    # Status bands use the same inclusive thresholds as the API contract.
    engine_status = np.select(
        [health_score > 85, health_score >= 70],
        ["Healthy", "Warning"],
        default="Critical",
    )
    timestamps = pd.date_range(
        start=pd.Timestamp.now(tz="UTC").floor("s"),
        periods=rows,
        freq="s",
    )

    # Stable column order is part of the CSV and API data contract.
    return pd.DataFrame(
        {
            "timestamp": timestamps,
            "rpm": np.round(rpm, 1),
            "cht": np.round(cht, 2),
            "egt": np.round(egt, 2),
            "fuel_flow": np.round(fuel_flow, 2),
            "vibration": np.round(vibration, 3),
            "health_score": np.round(health_score, 2),
            "engine_status": engine_status,
            "fault_type": fault_type,
        }
    )


def main() -> None:
    """Parse generation options and write the CSV dataset."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--rows",
        type=int,
        default=MINIMUM_ROWS,
        help=f"number of rows to generate (minimum {MINIMUM_ROWS:,})",
    )
    parser.add_argument("--seed", type=int, default=2026, help="random seed")
    parser.add_argument(
        "--output",
        type=Path,
        default=DATASET_PATH,
        help="CSV destination (defaults to backend/data/telemetry_dataset.csv)",
    )
    args = parser.parse_args()

    dataset = generate_dataset(rows=args.rows, seed=args.seed, output_path=args.output)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(args.output, index=False, date_format="%Y-%m-%dT%H:%M:%S%z")
    print(f"Wrote {len(dataset):,} rows to {args.output.resolve()}")


if __name__ == "__main__":
    main()
