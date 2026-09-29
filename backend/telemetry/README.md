# Simulated Engine Telemetry

This module generates generic demo data in memory. It does not represent real measured telemetry, a particular engine model, or certified operating limits. The profile defaults are illustrative assumptions only; configure them for a demo rather than treating them as OEM guidance.

## Reading Contract

Each reading is JSON serializable and contains:

| Field | Meaning and unit |
| --- | --- |
| `engine_id` | Simulated engine identifier (string) |
| `sequence` | Increasing integer for this generator instance |
| `timestamp` | Timezone-aware UTC ISO 8601 timestamp |
| `rpm` | Engine speed, revolutions per minute |
| `cht` | Cylinder-head temperature, degrees Celsius |
| `egt` | Exhaust-gas temperature, degrees Celsius |
| `fuel_flow` | Fuel flow, litres per hour |
| `vibration` | Vibration, metres per second squared RMS |

## Behavior And Configuration

`TelemetryConfig` configures `engine_id`, `sample_interval_seconds`, bounded `history_size`, optional repeatable `seed`, and a `DemoProfile`. The profile configures the illustrative load and sensor ranges, bounded load changes, small measurement variation, and response rates. Defaults are intentionally generic, not validated engine limits.

Load moves gradually within its configured range. RPM and fuel flow track load, EGT responds relatively quickly, and CHT responds more gradually. All generated sensor values stay within the configured profile bounds. The generator retains only the most recent configured number of readings.

## Endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/telemetry/current` | Generate and return one new reading |
| GET | `/telemetry/history?limit=N` | Return recent readings in chronological order; `limit` defaults to 100 and must be 1-500 |
| WebSocket | `/telemetry/stream` | Send a new reading at the configured sample interval |

When mounted with the `/api` prefix, these are available at `/api/telemetry/current`, `/api/telemetry/history`, and `/api/telemetry/stream`.

## Integration And Manual Smoke Check

Install the declared dependency with `pip install -r requirements.txt`. In the API owner's FastAPI application, import and mount the default router:

```python
from backend.telemetry import telemetry_router

app.include_router(telemetry_router, prefix="/api")
```

Start the API owner's app using the project's normal ASGI command, for example `uvicorn <api_module>:app --reload`. Then check `GET http://127.0.0.1:8000/api/telemetry/current`, `GET http://127.0.0.1:8000/api/telemetry/history?limit=10`, and `http://127.0.0.1:8000/docs` for the HTTP routes. The WebSocket URL is `ws://127.0.0.1:8000/api/telemetry/stream`; a browser developer-console smoke check is:

```javascript
const socket = new WebSocket("ws://127.0.0.1:8000/api/telemetry/stream");
socket.onmessage = (event) => console.log(JSON.parse(event.data));
// Close it when finished: socket.close();
```

To use a custom profile or seed instead of the default demo instance:

```python
from backend.telemetry import DemoProfile, TelemetryConfig, TelemetryGenerator, create_telemetry_router

generator = TelemetryGenerator(TelemetryConfig(seed=7, profile=DemoProfile()))
app.include_router(create_telemetry_router(generator), prefix="/api")
```