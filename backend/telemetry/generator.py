import math
import random
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, List, Optional

from .models import TelemetryReading


@dataclass(frozen=True)
class DemoProfile:
    """Illustrative demo ranges and response rates, not engine operating limits."""

    load_min: float = 0.2
    load_max: float = 0.85
    rpm_idle: float = 900.0
    rpm_max: float = 2700.0
    cht_min: float = 90.0
    cht_max: float = 220.0
    egt_min: float = 450.0
    egt_max: float = 850.0
    fuel_flow_min: float = 8.0
    fuel_flow_max: float = 32.0
    vibration_min: float = 0.1
    vibration_max: float = 2.5
    load_step_max: float = 0.04
    noise_fraction: float = 0.005
    rpm_response: float = 0.3
    cht_response: float = 0.08
    egt_response: float = 0.5
    fuel_flow_response: float = 0.4
    vibration_response: float = 0.2

    def __post_init__(self) -> None:
        values = vars(self)
        if not all(math.isfinite(value) for value in values.values()):
            raise ValueError("Demo profile values must be finite.")
        if not 0.0 <= self.load_min < self.load_max <= 1.0:
            raise ValueError("Load bounds must satisfy 0 <= load_min < load_max <= 1.")
        for minimum, maximum in (
            (self.rpm_idle, self.rpm_max),
            (self.cht_min, self.cht_max),
            (self.egt_min, self.egt_max),
            (self.fuel_flow_min, self.fuel_flow_max),
            (self.vibration_min, self.vibration_max),
        ):
            if minimum < 0.0 or minimum >= maximum:
                raise ValueError("Sensor profile bounds must be non-negative and increasing.")
        if self.load_step_max < 0.0 or self.noise_fraction < 0.0:
            raise ValueError("Load step and noise must be non-negative.")
        for response in (
            self.rpm_response,
            self.cht_response,
            self.egt_response,
            self.fuel_flow_response,
            self.vibration_response,
        ):
            if not 0.0 <= response <= 1.0:
                raise ValueError("Sensor response values must be between 0 and 1.")


@dataclass(frozen=True)
class TelemetryConfig:
    engine_id: str = "demo-engine-1"
    sample_interval_seconds: float = 1.0
    history_size: int = 500
    seed: Optional[int] = None
    profile: DemoProfile = field(default_factory=DemoProfile)

    def __post_init__(self) -> None:
        if not self.engine_id.strip():
            raise ValueError("engine_id must not be empty.")
        if not math.isfinite(self.sample_interval_seconds) or self.sample_interval_seconds <= 0.0:
            raise ValueError("sample_interval_seconds must be a finite positive number.")
        if self.history_size < 1:
            raise ValueError("history_size must be at least 1.")


class TelemetryGenerator:
    """Generate smooth, generic demo readings with bounded random variation."""

    def __init__(self, config: TelemetryConfig | None = None) -> None:
        self.config = config or TelemetryConfig()
        self._random = random.Random(self.config.seed)
        self._sequence = 0
        self._load = (self.config.profile.load_min + self.config.profile.load_max) / 2.0
        self._history: Deque[TelemetryReading] = deque(maxlen=self.config.history_size)
        self._lock = threading.Lock()
        self._values = {
            "rpm": (self.config.profile.rpm_idle + self.config.profile.rpm_max) / 2.0,
            "cht": (self.config.profile.cht_min + self.config.profile.cht_max) / 2.0,
            "egt": (self.config.profile.egt_min + self.config.profile.egt_max) / 2.0,
            "fuel_flow": (self.config.profile.fuel_flow_min + self.config.profile.fuel_flow_max) / 2.0,
            "vibration": (self.config.profile.vibration_min + self.config.profile.vibration_max) / 2.0,
        }

    def generate(self) -> TelemetryReading:
        with self._lock:
            return self._generate_locked()

    def _generate_locked(self) -> TelemetryReading:
        profile = self.config.profile
        self._load = min(
            profile.load_max,
            max(
                profile.load_min,
                self._load + self._random.uniform(-profile.load_step_max, profile.load_step_max),
            ),
        )
        load_fraction = (self._load - profile.load_min) / (profile.load_max - profile.load_min)
        ranges = {
            "rpm": (profile.rpm_idle, profile.rpm_max, profile.rpm_response),
            "cht": (profile.cht_min, profile.cht_max, profile.cht_response),
            "egt": (profile.egt_min, profile.egt_max, profile.egt_response),
            "fuel_flow": (profile.fuel_flow_min, profile.fuel_flow_max, profile.fuel_flow_response),
            "vibration": (profile.vibration_min, profile.vibration_max, profile.vibration_response),
        }
        for name, (minimum, maximum, response) in ranges.items():
            span = maximum - minimum
            target = minimum + span * load_fraction
            target += self._random.uniform(-span * profile.noise_fraction, span * profile.noise_fraction)
            target = min(maximum, max(minimum, target))
            self._values[name] += response * (target - self._values[name])
            self._values[name] = min(maximum, max(minimum, self._values[name]))

        self._sequence += 1
        reading = TelemetryReading(
            engine_id=self.config.engine_id,
            sequence=self._sequence,
            timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            **{name: round(value, 2) for name, value in self._values.items()},
        )
        self._history.append(reading)
        return reading

    def recent(self, limit: int) -> List[TelemetryReading]:
        with self._lock:
            if limit < 1:
                return []
            return list(self._history)[-min(limit, self.config.history_size):]