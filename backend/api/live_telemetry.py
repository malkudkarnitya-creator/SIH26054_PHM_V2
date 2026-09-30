"""Stateful synthetic live telemetry for an aero-piston engine."""

import math
import random
from datetime import datetime, timezone
from threading import Lock

from fastapi import APIRouter

from .models import (
    LiveFaultClassification,
    LiveTelemetry,
    LiveTelemetryValues,
    MissionRecommendation,
)

router = APIRouter(tags=["Live Telemetry"])


class LiveTelemetryEngine:
    """Generate bounded telemetry and short, randomly scheduled fault episodes."""

    def __init__(self, seed: int | None = None) -> None:
        self._random = random.Random(seed)
        self._lock = Lock()
        self._sample_index = 0
        self._fault_mode: LiveFaultClassification = "HEALTHY"
        self._fault_requests_remaining = 0
        self._requests_until_fault = self._random.randint(4, 8)

    def _next_fault_mode(self) -> LiveFaultClassification:
        if self._fault_requests_remaining:
            self._fault_requests_remaining -= 1
            return self._fault_mode

        if self._requests_until_fault:
            self._requests_until_fault -= 1
            self._fault_mode = "HEALTHY"
            return self._fault_mode

        self._fault_mode = self._random.choice(
            ("COOLING_ISSUE", "ENGINE_DEGRADATION")
        )
        self._fault_requests_remaining = self._random.randint(2, 5)
        self._requests_until_fault = self._random.randint(4, 8)
        return self._fault_mode

    @staticmethod
    def _health_score(
        telemetry: LiveTelemetryValues,
    ) -> float:
        load = max(0.0, min(1.0, (telemetry.rpm - 1800) / 900))
        expected_fuel_flow = 5 + 23 * load**1.6
        penalties = (
            max(0.0, telemetry.cht - 200) * 0.5
            + max(0.0, telemetry.egt - 700) * 0.18
            + max(0.0, telemetry.oil_temperature - 100) * 0.7
            + max(0.0, telemetry.vibration - 1.5) * 12
            + max(0.0, telemetry.fuel_flow - expected_fuel_flow) * 2
        )
        return round(max(0.0, min(100.0, 100.0 - penalties)), 2)

    @staticmethod
    def _recommendation(health_score: float) -> MissionRecommendation:
        if health_score > 85:
            return "CONTINUE MISSION"
        if health_score >= 60:
            return "REDUCE POWER"
        return "RETURN TO BASE"

    def sample(self) -> LiveTelemetry:
        """Generate one validated sample while keeping sequence state thread-safe."""
        with self._lock:
            index = self._sample_index
            self._sample_index += 1
            fault_mode = self._next_fault_mode()

            load = (
                0.48
                + 0.12 * math.sin(index / 17)
                + 0.035 * math.sin(index / 4.5)
            )
            noise = self._random.gauss
            rpm = 1800 + 900 * load + noise(0, 14)
            egt = 500 + 300 * load + noise(0, 7)
            cht = 125 + 105 * load + noise(0, 2.5)
            fuel_flow = 5 + 23 * load**1.6 + noise(0, 0.35)
            vibration = 0.5 + 1.5 * load + 0.5 * load**2 + noise(0, 0.08)
            oil_temperature = 58 + 48 * load + noise(0, 1.5)

            if fault_mode == "COOLING_ISSUE":
                cht += self._random.uniform(22, 38)
                egt += self._random.uniform(12, 28)
                oil_temperature += self._random.uniform(5, 10)
            elif fault_mode == "ENGINE_DEGRADATION":
                vibration += self._random.uniform(2.2, 3.4)
                fuel_flow *= self._random.uniform(1.25, 1.4)
                egt += self._random.uniform(10, 24)

            telemetry = LiveTelemetryValues(
                rpm=round(max(1800, min(2800, rpm)), 1),
                egt=round(max(500, min(850, egt)), 1),
                cht=round(max(120, min(250, cht)), 1),
                fuel_flow=round(max(5, min(40, fuel_flow)), 2),
                vibration=round(max(0.5, min(6.0, vibration)), 2),
                oil_temperature=round(max(60, min(120, oil_temperature)), 1),
            )
            health_score = self._health_score(telemetry)
            return LiveTelemetry(
                telemetry=telemetry,
                fault_classification=fault_mode,
                health_score=health_score,
                mission_recommendation=self._recommendation(health_score),
                timestamp=datetime.now(timezone.utc),
            )


engine = LiveTelemetryEngine()


@router.get("/telemetry/live", response_model=LiveTelemetry)
def live_telemetry() -> LiveTelemetry:
    """Return the next simulated engine sample."""
    return engine.sample()
