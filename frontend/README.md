# Mission Control

React/Vite frontend. Production defaults to https://sih26054-phm-v2.onrender.com.

```sh
npm ci
npm run dev
npm run build
npm test
npm run test:e2e -- tests/browser/frontend.spec.js
npm run test:integration
```

The integration command builds `dist-local/` with `VITE_API_BASE_URL=http://127.0.0.1:8001`, starts the real local FastAPI server, and exercises all seven endpoints in Edge. It leaves the Render-targeted production `dist/` intact. The Windows test configuration expects the project Python environment at `../../.venv/Scripts/python.exe`. Install `requirements-dev.txt` there first.

For the strict deployed-backend check in PowerShell:

```powershell
$env:PHM_LIVE = '1'
npm run test:e2e -- tests/browser/live.spec.js
```

A replay HTTP error, CORS failure, missing timeline, or console error fails that test. It never substitutes fixtures for the real backend.

CSV requires `rpm,egt,cht,throttle`; throttle is percent (0–100). Quoted fields follow RFC 4180 grammar; doubled quotes are valid escapes, malformed/nested quotes are rejected. CRLF and LF row endings and UTF-8 BOM are supported. Missing required values, duplicate headers, wrong row widths, invalid decimal numbers, NaN and Infinity are rejected before any POST.

Optional analysis columns: `timestamp,altitude,ambient_temperature,health_factor,reset_filter`. Replay requires a timezone-qualified ISO timestamp in every row, in increasing order. The entire CSV becomes the current mission telemetry; analysis uses its final row and replay uses all its rows. Reset clears that snapshot by reloading the demo.

Frontend runtime contracts live in `src/api/contracts.js`; the corresponding backend request/response models and published OpenAPI schema come from `backend/api/models.py`. No page performs its own response normalization.

The active command navigation includes Dashboard, Telemetry, Fleet, Digital Twin, Replay, Diagnosis, and Analytics. Dashboard and Digital Twin are local simulations; Fleet uses the V2 API; Replay, Diagnosis, and Analytics use the legacy analysis API. Health, Validation, and Experiments remain available under Engineering Tools. All model outputs are demonstrator estimates, not flight clearance or maintenance limits. See the [repository project audit](../PROJECT_AUDIT.md) for implementation status and deployment priorities.

See [implementation changes and deployment instructions](../implementation/CHANGES.md) and [backend deployment patch](../implementation/backend-deployment.patch). Earlier audit/verification files are historical snapshots, not the status of the corrected code.
