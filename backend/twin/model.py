"""Transparent reduced-order demonstrator; constants are synthetic, not OEM limits.

No learned model or certified airworthiness prediction is implied. The pure model
is shared by the live service and counterfactual forecasts to prevent drift.
"""
from dataclasses import dataclass, field
from math import exp, sin

from .schemas import Controls

MODEL_VERSION = "reduced-order-2.0.0"
# name, unit, nominal envelope, absolute display range, residual tolerance, weight, time constant
SIGNALS = {
    "rpm": ("Engine speed", "rpm", 2000, 5500, 0, 6500, 350, .10, 2),
    "egt": ("Exhaust gas", "Â°C", 350, 820, 0, 1000, 70, .18, 8),
    "cht": ("Cylinder head", "Â°C", 70, 220, 0, 300, 25, .17, 15),
    "oil_temperature": ("Oil temperature", "Â°C", 60, 120, 0, 180, 20, .15, 20),
    "oil_pressure": ("Oil pressure", "bar", 2.5, 6, 0, 8, 1.2, .20, 4),
    "fuel_flow": ("Fuel flow", "L/h", 8, 32, 0, 40, 6, .08, 3),
    "vibration": ("Vibration", "mm/s RMS", 0, 5, 0, 15, 2.5, .12, 3),
}


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def expected_state(controls: Controls):
    load = controls.rpm_target / 5800
    ambient = controls.ambient_temperature - 25
    return {
        "rpm": controls.rpm_target,
        "egt": 420 + 330 * load + ambient * .7,
        "cht": 85 + 115 * load + ambient * .65,
        "oil_temperature": 58 + 44 * load + ambient * .5,
        "oil_pressure": 3.2 + 1.8 * load - ambient * .015,
        "fuel_flow": 5 + 23 * load ** 1.6,
        "vibration": .65 + 1.4 * load ** 2,
    }


@dataclass
class EngineState:
    sensors: dict = field(default_factory=lambda: expected_state(Controls()))
    # Demonstrator starts with 18% of its assumed wear budget consumed.
    wear: float = .18
    elapsed_seconds: float = 0.0
    samples: int = 0


def damage_rate(sensors, controls):
    """Fraction of wear budget / hour. Baseline assumed life: 800 hours."""
    load = max(.2, sensors["rpm"] / 4800)
    thermal = max(0, (sensors["cht"] - 180) / 60) + max(0, (sensors["oil_temperature"] - 105) / 40)
    lubrication = max(0, 3.0 - sensors["oil_pressure"])
    vibration = max(0, sensors["vibration"] - 2) / 3
    expected = expected_state(controls)
    combustion = max(0, (sensors["egt"] - expected["egt"]) / 70)
    starvation = max(0, 1 - sensors["fuel_flow"] / expected["fuel_flow"] - .12) * 4
    return (load ** 2.2 * (1 + thermal ** 2 * 3 + lubrication ** 2 * 5 + vibration ** 2 * 2 + combustion ** 2 * 2 + starvation ** 2 * 3)
            * (1 + .8 * controls.mission.environmental_severity) / 800)


def advance(state: EngineState, controls: Controls, dt: float, *, noise=True):
    target = expected_state(controls)
    fuel = controls.fuel_flow_multiplier
    target["fuel_flow"] *= fuel
    target["egt"] += (1 - fuel) * 180
    target["cht"] += (1 - fuel) * 35
    if controls.scenario == "cooling_loss":
        target["cht"] += 85
        target["egt"] += 90
        target["oil_temperature"] += 38
    elif controls.scenario == "oil_leak":
        target["oil_pressure"] = 1.4
        target["oil_temperature"] += 42
        target["vibration"] += 2
    elif controls.scenario == "bearing_wear":
        target["vibration"] += 6.8
        target["oil_temperature"] += 24
        target["oil_pressure"] -= .8
    elif controls.scenario == "fuel_restriction":
        target["fuel_flow"] *= .62
        target["rpm"] *= .87
        target["egt"] += 100
    state.elapsed_seconds += dt
    for index, (key, spec) in enumerate(SIGNALS.items()):
        perturbation = sin(state.elapsed_seconds * .37 + index * 1.6) * spec[6] * .012 if noise else 0
        state.sensors[key] += (target[key] + perturbation - state.sensors[key]) * (1 - exp(-dt / spec[8]))
    state.wear = clamp(state.wear + damage_rate(state.sensors, controls) * dt / 3600)
    state.samples += 1


def assess(state: EngineState, controls: Controls):
    expected = expected_state(controls)
    features, violations = [], []
    for key, spec in SIGNALS.items():
        name, unit, low, high, minimum, maximum, tolerance, weight, _ = spec
        value = state.sensors[key]
        residual = value - expected[key]
        deviation = abs(residual) / tolerance
        outside = max(0, low - value, value - high) / tolerance
        penalty = weight * clamp(max(deviation - .12, outside * 1.5) / 2) * 100
        status = "critical" if outside > .5 or deviation > 2 else "warning" if outside > 0 or deviation > .8 else "nominal"
        if outside > 0:
            violations.append(key)
        features.append({"key": key, "label": name, "unit": unit, "value": round(value, 2),
                         "expected": round(expected[key], 2), "residual": round(residual, 2),
                         "penalty": round(penalty, 3), "status": status,
                         "normal_min": low, "normal_max": high, "min": minimum, "max": maximum})
    total = sum(item["penalty"] for item in features)
    health = round(clamp(1 - state.wear * .25 - total / 100) * 100, 1)
    rate = damage_rate(state.sensors, controls)
    rul = max(0, (1 - state.wear) / rate)
    # Exponential survival with an explicit stress/condition-dependent hazard.
    hazard = (1 / max(rul, 1) + ((100 - health) / 100) ** 3 * .12) * (1 + controls.mission.environmental_severity)
    reliability = 100 * exp(-hazard * controls.mission.duration_hours) if state.wear < 1 else 0
    confidence = max(35, min(92, 64 + min(state.samples, 120) / 120 * 20 - len(violations) * 4))
    faults = []
    def fault(mode, reason, action, priority, hours, keys):
        faults.append({"id": mode.lower().replace(" ", "_"), "failure_mode": mode, "reason": reason,
                       "recommended_action": action, "priority": priority, "estimated_hours": hours,
                       "features": keys})
    if state.sensors["oil_pressure"] < 2.5:
        fault("Lubrication pressure loss", "Oil pressure is below the 2.5 bar demonstration envelope.",
              "Inspect oil lines, seals, filter and pump; verify pressure with an independent gauge.", "critical", 3.0, ["oil_pressure", "oil_temperature"])
    if state.sensors["cht"] > 220 or state.sensors["oil_temperature"] > 120:
        fault("Thermal overload", "Cylinder head or oil temperature exceeds the demonstration thermal envelope.",
              "Inspect cooling airflow, fins and oil cooler; perform a controlled ground thermal check.", "high", 2.5, ["cht", "oil_temperature", "egt"])
    if state.sensors["vibration"] > 5:
        fault("Rotating assembly anomaly", "Vibration exceeds 5 mm/s RMS; bearing wear or imbalance is a possible cause.",
              "Inspect mounts and propeller balance; check bearing clearances and oil debris.", "high", 5.0, ["vibration", "oil_temperature"])
    if state.sensors["fuel_flow"] < expected["fuel_flow"] * .8:
        fault("Fuel delivery anomaly", "Fuel flow is more than 20% below the operating-point expectation.",
              "Inspect fuel filter, delivery pressure and injector flow; check mixture calibration.", "high", 2.0, ["fuel_flow", "egt", "rpm"])
    if abs(state.sensors["rpm"] - expected["rpm"]) > 700 or state.sensors["egt"] > 820:
        fault("Power or combustion deviation", "Speed tracking or exhaust temperature is outside the demonstration envelope.",
              "Check governor response, ignition timing and compression against the engine manual.", "high", 3.5, ["rpm", "egt"])
    covered = {key for item in faults for key in item["features"]}
    uncovered = [key for key in violations if key not in covered]
    if uncovered:
        fault("Sensor envelope excursion", "Channels outside the demonstration envelope: " + ", ".join(uncovered) + ".",
              "Verify sensor calibration and operating conditions; inspect affected systems against the engine manual.", "high", 1.5, uncovered)
    if not faults:
        fault("Routine condition inspection", "No monitored fault rule is currently active.",
              "Continue scheduled inspection; review oil trend and sensor calibration at the next service.", "routine", .5, [])
    faults.sort(key=lambda f: {"critical": 0, "high": 1, "routine": 2}[f["priority"]])
    for item in features:
        item["importance"] = round(item["penalty"] / total * 100, 1) if total else 0
    decision = "HOLD / INSPECT" if any(f["priority"] == "critical" for f in faults) or reliability < 80 or health < 55 else "REVIEW REQUIRED" if reliability < 95 or any(f["priority"] == "high" for f in faults) else "WITHIN DEMO ENVELOPE"
    return {
        "health_index": health, "wear_percent": round(state.wear * 100, 3),
        "rul": {"hours": round(rul, 1), "lower_hours": round(rul * .65, 1), "upper_hours": round(rul * 1.35, 1),
                "wear_rate_per_hour": round(rate, 7), "interval_kind": "Assumed Â±35% sensitivity band; not a calibrated confidence interval"},
        "mission": {**controls.mission.model_dump(), "reliability_percent": round(reliability, 2), "hazard_per_hour": round(hazard, 6), "decision": decision},
        "explainability": {"confidence_percent": round(confidence, 1), "confidence_kind": "Heuristic model support, not fault probability",
                           "method": "Weighted physics residuals + envelope rules", "features": sorted(features, key=lambda f: f["penalty"], reverse=True),
                           "reasoning": [f["reason"] for f in faults], "health_penalty": round(total, 3), "wear_penalty": round(state.wear * 25, 3)},
        "maintenance": faults, "sensors": {k: round(v, 2) for k, v in state.sensors.items()},
        "expected": {k: round(v, 2) for k, v in expected.items()}, "model_version": MODEL_VERSION,
    }

