"""Thread-safe single-engine service with durable SQLite checkpoints and history."""
import copy
import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from time import monotonic

from .model import EngineState, advance, assess, damage_rate, clamp
from .schemas import Controls, Telemetry, WhatIf


def utcnow():
    return datetime.now(timezone.utc)


class TwinService:
    def __init__(self, database: str):
        self.lock = threading.RLock()
        if database != ":memory:":
            Path(database).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(database, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS checkpoint (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS history (sequence INTEGER PRIMARY KEY, payload TEXT NOT NULL)")
        self.state = EngineState()
        self.controls = Controls()
        self.sequence = 0
        self.observed_at = None
        self.sample_source = "simulation"
        saved = self.db.execute("SELECT payload FROM checkpoint WHERE id=1").fetchone()
        if saved:
            data = json.loads(saved[0])
            self.state = EngineState(**data["state"])
            self.controls = Controls.model_validate(data["controls"])
            self.sequence = data["sequence"]
            self.observed_at = datetime.fromisoformat(data["observed_at"]) if data["observed_at"] else None
            self.sample_source = data["sample_source"]
        self.last_tick = monotonic()

    def snapshot(self):
        with self.lock:
            result = assess(self.state, self.controls)
            age = max(0, (utcnow() - self.observed_at).total_seconds()) if self.observed_at else None
            waiting = self.controls.source != self.sample_source or self.observed_at is None
            status = "waiting" if waiting else "paused" if self.controls.source == "simulation" and not self.controls.running else "stale" if age > 5 else "live"
            if status != "live":
                result["explainability"]["confidence_percent"] = 0
            return {**result, "engine_id": "VAYU-01", "sequence": self.sequence,
                    "timestamp": self.observed_at.isoformat() if self.observed_at else None,
                    "server_time": utcnow().isoformat(), "source": self.sample_source,
                    "controls": self.controls.model_dump(),
                    "quality": {"status": status, "age_seconds": round(age, 1) if age is not None else None,
                                "samples": self.state.samples, "sample_interval_seconds": 1},
                    "disclaimer": "Synthetic research demonstrator. Model-derived estimates require engine-specific calibration; not flight clearance."}

    def _save(self, record=True):
        self.sequence += 1
        payload = {"state": {"sensors": self.state.sensors, "wear": self.state.wear,
                             "elapsed_seconds": self.state.elapsed_seconds, "samples": self.state.samples},
                   "controls": self.controls.model_dump(), "sequence": self.sequence,
                   "observed_at": self.observed_at.isoformat() if self.observed_at else None,
                   "sample_source": self.sample_source}
        with self.db:
            self.db.execute("INSERT OR REPLACE INTO checkpoint VALUES (1, ?)", (json.dumps(payload),))
            if record:
                snapshot = self.snapshot()
                row = {key: snapshot[key] for key in ("timestamp", "sequence", "sensors", "expected", "health_index", "source")}
                row["reliability_percent"] = snapshot["mission"]["reliability_percent"]
                row["rul_hours"] = snapshot["rul"]["hours"]
                self.db.execute("INSERT INTO history VALUES (?, ?)", (self.sequence, json.dumps(row)))
                self.db.execute("DELETE FROM history WHERE sequence NOT IN (SELECT sequence FROM history ORDER BY sequence DESC LIMIT 3600)")

    def tick(self):
        with self.lock:
            now = monotonic()
            dt = min(5, max(0, now - self.last_tick))
            self.last_tick = now
            if self.controls.source == "simulation" and self.controls.running:
                advance(self.state, self.controls, dt)
                self.observed_at = utcnow()
                self.sample_source = "simulation"
                self._save()

    def configure(self, controls: Controls):
        with self.lock:
            self.controls = controls.model_copy(deep=True)
            self.last_tick = monotonic()
            self._save(record=False)
            return self.snapshot()

    def ingest(self, telemetry: Telemetry):
        with self.lock:
            if self.controls.source != "telemetry":
                raise ValueError("Select telemetry source before ingesting external samples.")
            age = (utcnow() - telemetry.timestamp).total_seconds()
            if age < -2 or age > 10:
                raise ValueError("Telemetry timestamp must be within the last 10 seconds and at most 2 seconds in the future.")
            previous = self.observed_at if self.sample_source == "telemetry" else None
            if previous and telemetry.timestamp <= previous:
                raise ValueError("Telemetry timestamps must be strictly increasing.")
            dt = min(10, (telemetry.timestamp - previous).total_seconds()) if previous else 0
            self.state.sensors = telemetry.sensors.model_dump()
            self.state.wear = clamp(self.state.wear + damage_rate(self.state.sensors, self.controls) * dt / 3600)
            self.state.elapsed_seconds += dt
            self.state.samples += 1
            self.observed_at = telemetry.timestamp
            self.sample_source = "telemetry"
            self._save()
            return self.snapshot()

    def history(self, limit=180):
        with self.lock:
            rows = self.db.execute("SELECT payload FROM history ORDER BY sequence DESC LIMIT ?", (limit,)).fetchall()
            return [json.loads(row[0]) for row in reversed(rows)]

    def what_if(self, request: WhatIf):
        with self.lock:
            base_state, alternate = copy.deepcopy(self.state), copy.deepcopy(self.state)
            original, changed = self.controls.model_copy(deep=True), self.controls.model_copy(deep=True)
            sequence = self.sequence
            quality = self.snapshot()["quality"]
        changed.rpm_target = clamp(original.rpm_target + request.rpm_adjustment, 2000, 5800)
        changed.ambient_temperature = clamp(original.ambient_temperature + request.temperature_variation, -20, 55)
        changed.fuel_flow_multiplier = clamp(original.fuel_flow_multiplier * (1 + request.fuel_flow_variation / 100), .7, 1.3)
        trajectory = []
        # Both branches evolve for the same horizon; no live state is modified.
        steps = int(request.horizon_minutes * 6)
        for index in range(steps + 1):
            if index:
                advance(base_state, original, 10, noise=False)
                advance(alternate, changed, 10, noise=False)
            if index % max(1, steps // 30) == 0 or index == steps:
                baseline, candidate = assess(base_state, original), assess(alternate, changed)
                trajectory.append({"minutes": round(index / 6, 2), "baseline_reliability": baseline["mission"]["reliability_percent"],
                                   "candidate_reliability": candidate["mission"]["reliability_percent"],
                                   "baseline_rul": baseline["rul"]["hours"], "candidate_rul": candidate["rul"]["hours"]})
        return {"baseline_sequence": sequence, "baseline_quality": quality, "request": request.model_dump(),
                "effective_controls": changed.model_dump(), "baseline": baseline, "candidate": candidate,
                "delta": {"reliability_points": round(candidate["mission"]["reliability_percent"] - baseline["mission"]["reliability_percent"], 2),
                          "rul_hours": round(candidate["rul"]["hours"] - baseline["rul"]["hours"], 1),
                          "health_points": round(candidate["health_index"] - baseline["health_index"], 1)},
                "trajectory": trajectory,
                "assumption": "Same-horizon reduced-order forecast, holding selected fault scenario and mission conditions constant. External telemetry faults are not identified automatically for forecast propagation."}

    def close(self):
        with self.lock:
            self.db.close()
