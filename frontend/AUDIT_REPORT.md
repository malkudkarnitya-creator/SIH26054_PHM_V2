# Frontend audit and integration report

Audited on 12 September 2026. API: https://sih26054-phm.onrender.com

The React frontend builds successfully and communicates with the deployed FastAPI service. Health history, validation, CSV analysis, health/risk scores, classification, mission decisions, experiments, and estimator reset were verified in a real headless Edge browser against the production build.

**Remaining external blocker:** the deployed `POST /api/replay` returns HTTP 500 for valid telemetry. The frontend handles this with a visible error and retry control. Successful playback and controls are covered using explicit test fixtures; successful live replay is **not** claimed.

## Scope and project structure

- `frontend/`: Vite + React 18, React Router, Axios, Recharts, Framer Motion, Lucide, CSS, Tailwind/PostCSS configuration.
- Entry chain: `index.html → src/main.jsx → BrowserRouter → App.jsx`.
- Inspected every frontend source file, all seven pages, shared components, API client, styling, entry points, dependencies, and build configuration.
- Added `src/hooks/useResource.js` for asynchronous resource state and `src/lib/telemetry.js` for telemetry parsing/validation.
- No separate `app/`, top-level `pages/`, `services/`, `store/`, or `context/` exists in this frontend. Shared mission data lives in App and is passed to pages. No additional state framework is needed.
- This is JavaScript/JSX, not TypeScript. There is no TypeScript configuration or TypeScript source to type-check.
- `backend/api/`, Python `src/uav_health/`, Python tests, and the legacy Python `dashboard.py` were not modified. Backend code/schema were read only to understand integration contracts.
- No applicable `AGENTS.md` was found.
- No missing import paths remained after the audit. The duplicate import in Experiments was a syntax/build error.
- No production mock data generator remains. Demo flight, history, validation, replay and experiments are requested from the backend. Test fixtures are isolated under `tests/`.
- The deleted legacy `src/api.js` was already deleted at the start of this task and had no remaining callers. Existing unused presentation CSS was retained to preserve styling.

## Dependency map

All endpoint paths below resolve against `https://sih26054-phm.onrender.com`.

| Frontend page / action | Hook or state owner | API service | Backend endpoint | Rendering components |
| --- | --- | --- | --- | --- |
| Mission Control `/`, initial load | App → useResource(loadMission) | loadMission → getDemoFlight → analyzeTelemetry | GET /api/demo-flight → POST /api/analyze | Dashboard → KpiCard, GaugeChart, TelemetryChart, StatusBadge |
| Mission Control, CSV upload | App useState/useRef; Dashboard file handler | parseTelemetryCsv → analyzeTelemetry | POST /api/analyze | Updated Dashboard, Health, Diagnosis from one shared mission snapshot |
| Mission Control, reset estimator | App action handler | resetEstimator → reload mission | POST /reset → GET /api/demo-flight → POST /api/analyze | Dashboard and shared mission data |
| Telemetry Analytics `/analytics` | useResource(getHealthHistory) | getHealthHistory | GET /api/health-history | Card → four TelemetryChart instances |
| Engine Health `/health` | Shared App mission resource | loadMission / analyzeTelemetry | GET /api/demo-flight → POST /api/analyze | Health → GaugeChart, state comparison rows |
| Fault Diagnosis `/diagnosis` | Shared App mission resource | loadMission / analyzeTelemetry | GET /api/demo-flight → POST /api/analyze | Diagnosis → StatusBadge, confidence bar |
| Replay Center `/replay` | useResource(loadReplay); playback state/effect | loadReplay → getDemoFlight → runReplay | GET /api/demo-flight → POST /api/replay | Replay → TelemetryChart, frame slider, playback controls; ResourceState on failure |
| Validation `/validation` | useResource(getValidationMetrics) | getValidationMetrics | GET /api/validation | Metric cards, confusion matrix |
| Experiment Lab `/experiments` | useState/useRef action guard | runExperiment | POST /api/experiment | Scenario form and backend result panel |

## Findings, root causes, and fixes

| Issue / root cause | Exact frontend fix |
| --- | --- |
| Experiments declared `useState` twice, preventing parsing of an eagerly imported page and the entire app build. | Removed the duplicate import and formatted the component into maintainable handlers/state declarations. |
| One global startup gate prevented every route from rendering when demo loading or analysis failed. No recovery control existed. | Render the navigation shell independently; gate only pages requiring mission data; add resource loading/error/retry states. Independent history, validation, replay and experiment pages remain reachable. |
| Unexpected response shapes reached `.toFixed()`, array `.map()`, and object property reads directly, allowing runtime crashes. | Validate API response shapes, finite scores, state vectors, history arrays, replay timeline, experiment envelope, and confusion matrix before saving data. Add route and root error boundaries. |
| Uploaded analysis lived separately from demo telemetry, leaving measured RPM/EGT/CHT and charts stale. | Commit uploaded telemetry, latest measurement, analysis, source, and update time together in one mission snapshot shared by Dashboard, Health and Diagnosis. |
| Dashboard used the optional `fault` alias while other pages used `fault_type`; risk was never shown. | Use canonical `fault_type` everywhere. Display backend risk in the existing analysis card and Health page. Normalize the supported estimated-state alias at the API boundary. |
| Hardcoded trends, flight activity, timestamps, nominal states, and mission claims contradicted returned data. | Use backend scores/classification/decision, actual sample count, response time, data source, and calculated RPM variance. Remove invented trends. Label telemetry as snapshots/history/replay instead of a nonexistent live stream. |
| Gauge label was a descendant of a CSS-masked ring and was masked out. | Move the existing score label outside the masked ring while retaining the existing classes/layout. |
| Demo rows use `timestamp`, but the chart axis expected `time`; single-row uploads had no visible line. | Normalize chart x labels from time/timestamp/sample index and show a point for single-sample telemetry. Add an empty-data message. |
| CSV parsing converted every cell to Number, corrupting timestamps, converting blanks to zero and coercing boolean fields. Naive splitting failed on quoted commas. Only the last row was retained. | Parse quoted CSV fields, BOM, CRLF, headers, booleans, optional numeric fields and timestamps. Reject missing/duplicate headers, row-width mismatches, empty required fields and non-finite values. Keep all rows for charts; analyze only the last row. Ignore unrelated text columns. |
| Automatic throttle conversion could convert an actual 1% throttle to 100% or normalize data repeatedly. | Normalize fractional backend demo throttle once at the demo boundary. All API service inputs and CSV throttle values use documented 0–100 percent units. Preserve 1 as 1%. |
| A 10-second timeout was short for a hosted service startup; automatic retries could repeat stateful POST requests after a timeout. | Increase timeout to 90 seconds; remove automatic retries, format HTTP/timeout errors, and offer explicit retries. Deduplicate concurrent resource loads, including the StrictMode initialization chain. |
| FastAPI structured 422 details were rendered as unhelpful object strings. | Format field locations and validation messages into readable error text. |
| Loading effects could update state after navigation or after a newer effect run. | useResource ignores stale completions after cleanup and resets resource error/loading state on retry. It does not automatically replay failed requests. |
| Experiment controls allowed repeated submissions and showed a previous result while a new run was pending. | Add immediate in-flight guard, disable controls during submission, clear the previous result, and display failures. Correct the magnitude label: the backend uses additive magnitude, not percentage. |
| Replay loop wrapped to the first frame forever and reset did not pause playback. | Stop at the final frame, restart from zero when playing again, clear timers on cleanup, and make local STOP/RESET pause and rewind. Validate empty/malformed timelines. |
| POST /reset had no frontend integration. | Add an estimator reset control using the root `/reset` path, then reload/reanalyze the demo snapshot. Replay RESET is explicitly local playback reset. |
| Unknown routes displayed no useful content; mobile navigation controls lacked accessible names. | Add a not-found route with a home link and names for navigation, CSV upload and replay frame controls. |
| Long backend classification/decision strings could be clipped in KPI cards; experiment JSON could overflow. | Allow KPI wrapping, constrain overflowing result content, and set minimum widths for chart containers. Reuse the existing color palette for missing status tones. |
| Browser requested an absent favicon and emitted a console 404. | Declare an empty inline favicon in index.html. Verified the console error was eliminated. |
| No installed Node runtime, lockfile, or frontend tests existed in the workspace. | Downloaded checksum-verified portable Node 22.23.2 under ignored `.tools/`; installed dependencies; added package-lock.json, unit/browser checks, and test scripts. No system-wide Node installation. |

## Files changed or added by this task

Paths are relative to `frontend/` unless stated otherwise.

- `index.html`: eliminate missing-favicon request.
- `package.json`, `package-lock.json`: test tooling/scripts and reproducible dependency versions.
- `vite.config.js`: split framework/chart/animation dependencies into cacheable chunks and eliminate the bundle-size warning.
- `src/App.jsx`: mission state, startup recovery, reset integration, navigation fallback and truthful data labels.
- `src/api/phmApi.js`: centralized deployed origin, endpoint paths, response validation, timeout/error handling, resource deduplication, reset service.
- `src/components.jsx`: gauge label, chart timestamps/empty state/single-point visibility, shared resource state and error boundary.
- `src/main.jsx`: root error boundary.
- `src/pages/Dashboard.jsx`: CSV integration, coherent telemetry/analysis display, risk display, reset action, data-derived activity.
- `src/pages/Analytics.jsx`: validated resource loading/error/retry and history chart mapping.
- `src/pages/Health.jsx`: current shared analysis, risk display and canonical estimated state.
- `src/pages/Diagnosis.jsx`: canonical fault data, shared analysis and status tone.
- `src/pages/Replay.jsx`: request/error lifecycle and corrected playback controls.
- `src/pages/Validation.jsx`: validated resource lifecycle and matrix rendering.
- `src/pages/Experiments.jsx`: duplicate-import fix, submission guard and error/result state.
- `src/styles.css`: small rendering corrections for overflow, container sizing and missing status tones; original styles retained.
- New `src/hooks/useResource.js`, `src/lib/telemetry.js`.
- New `playwright.config.js`, `tests/telemetry.test.js`, `tests/browser/frontend.spec.js`, `tests/browser/live.spec.js`.
- New `tests/fixtures/analyze.json`, `tests/fixtures/replay.json`, `tests/fixtures/experiment.json`: reproducible request bodies.
- New frontend `.gitignore`: ignore dependencies/build/browser outputs.
- New workspace-root `.gitignore`: ignore the temporary `.tools/` runtime/cache only.
- New `AUDIT_REPORT.md` and `README.md`: audit evidence and run instructions.

The backend modification and deletion of legacy frontend `src/api.js` shown by git status **predate this task**. They were preserved. SHA-256 of `backend/api/main.py` both before and after this work:
`C68402E6FEDF553646F39B8C74047F093BC909CEAA6ACC461C7FDBE13A899FF5`.

## Validation evidence

| Check | Result |
| --- | --- |
| Production build | PASS: Vite 6.4.3, 2,629 modules transformed; output in dist/; no bundle-size warning. |
| Unit tests | PASS: 6/6. CSV types/structure, full-row validation, units, ranges, zero-score and response-shape handling. |
| Deterministic browser tests | PASS: 9/9, production build in headless Microsoft Edge. All routes, coherent upload state, reset, malformed/error responses, replay controls, duplicate-submit guard, mobile navigation and unknown routes. |
| Live browser integration | PASS for dashboard, upload, Health, Diagnosis, history, validation, experiment and reset; replay failure observed and handled. |
| Health history | HTTP 200; four rendered charts, 28 points per returned series. |
| Validation | HTTP 200; accuracy 96.8%, precision 95.2%, recall 94.7%, F1 94.9%; 4×4 matrix. |
| Demo analysis | HTTP 200; health 10.7%, risk 89.3%, fault HEALTHY, severity HIGH, decision CONTINUE_MISSION. These are actual backend values. |
| Uploaded healthy sample | HTTP 200; rpm 4576, egt 588, cht 175.2, throttle 72, altitude 1200 with a fresh filter produced health 100%, risk 0%, HEALTHY. Confirmed UI and cross-page updates. |
| Experiment | HTTP 200; returned metrics/results and predicted fault rendered. |
| Reset | POST /reset succeeded; demo analysis reloaded afterward. |
| Dashboard white screen | None in tested success, malformed-response, failed-request or unknown-route flows. |
| Browser console | No console errors or unhandled page exceptions across successful live flows. Live replay's backend 500 lacks CORS response headers and still produces browser network/CORS diagnostics. |
| Import/build integrity | Build passes; no remaining duplicate imports or unresolved frontend modules. No TypeScript source exists. |
| Whitespace integrity | git diff --check passed (only Windows line-ending notices). |
| Backend preservation | Entry-point SHA-256 unchanged; no backend/Python edits made. |
| Dependency installation audit | npm reported zero vulnerabilities for the installed dependency set. |

The automated live test deliberately accepts either a rendered replay or its visible failure state and records availability. Its passing status does not mean the deployed replay endpoint works.

## Remaining issues and limits

1. **Live replay is blocked by the backend.** A POST with the committed replay fixture returns HTTP 500. The deployed OpenAPI TelemetryRequest omits timestamp, while the local replay implementation expects timestamp after request-model serialization. This is a strong explanation for the failure, but server logs were unavailable to confirm the exact deployed exception. No endpoint or backend file was changed. The browser also reports missing CORS headers on this error response.
2. **Backend outputs can be internally surprising.** The demo analysis returns HEALTHY with HIGH severity, health 10.7%, risk 89.3%, and CONTINUE_MISSION. Health history returns flat zero health/100 risk on the deployed demo. Validation returns fixed metrics. The frontend preserves these authoritative responses instead of inventing corrections or substitute data.
3. **The estimator is global server state.** History and replay can alter it, and other clients can affect streaming results. CSV snapshots request a fresh filter; frontend changes cannot provide per-user backend isolation.
4. **Build/dependency scope:** the original 781.77 kB bundle was split into application (90.03 kB), animation (115.36 kB), framework (180.24 kB), and chart (393.72 kB) chunks. The size warning is eliminated. The installed Recharts 2.x line emits an upstream deprecation notice during installation; a major-version migration was kept outside this integration fix.
5. **Deployment hosting:** BrowserRouter requires an SPA fallback to index.html on the chosen static host. No frontend deployment target was supplied, so no site was deployed or host configuration changed. Direct routes were verified under Vite preview.
6. **CSV units:** throttle is percent (0–100), explicitly stated beside upload. Fractional backend demo input is adapted internally. A user CSV value of 0.72 means 0.72 percent.
7. Browser checks used desktop/mobile viewports in Edge; they are not exhaustive testing on every browser/device.

**Final status:** frontend build and required dashboard integrations verified. Backend unchanged. Live replay requires a backend deployment fix before the entire system can be described as fully operational.
