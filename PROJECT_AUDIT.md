# SIH26054 Mission Control — project audit

**Scope:** Repository source as inspected on 2026-09-28, including the current React/Vite route tree, supporting page modules, the parallel V2 cockpit, and FastAPI twin/API modules. Existing local edits were treated as in-progress work and preserved.

## Executive summary

The repository contains a substantial PHM demonstrator: a legacy telemetry-analysis API, a persistent V2 digital-twin service, interactive mission/reliability and what-if views, a fleet endpoint, and an analysis/replay UI. The main risk was not a lack of dashboard code, but fragmented entry points: the active app exposed only a subset of the existing pages, while a richer, API-backed V2 cockpit was not mounted by the active router.

The current UI now exposes the requested seven mission screens. Dashboard and Digital Twin use explicitly labeled local simulation values; Fleet uses the existing V2 fleet API and existing fleet-command component; Replay, Diagnosis, and Analytics retain the existing legacy API flows. Shared Health Score, Remaining Useful Life, and Mission Recommendation visualizations are present. These changes improve the demonstrator but do not make its synthetic model safe for operational decisions or deployment as an airworthiness product.

## Screen-by-screen status

| Screen | Status | Current implementation and remaining limitations |
|---|---|---|
| Dashboard | Improved; demonstrator-only | Shared health score, scenario RUL range, risk/recommendation panel, and fault-injection controls. Its current telemetry and scenario values come from local mock data, not the V2 engine service. |
| Telemetry | Present; demonstrator-only | Live-looking RPM, CHT, EGT, fuel, and vibration charts update from local simulated samples. No external sensor connection is made on this screen. |
| Fleet | Improved; API-backed demonstrator | Reuses the existing V2 fleet-command UI and `/api/v2/fleet` refresh flow, with selectable assets, readiness, risk, health, and RUL. The backend derives companion aircraft from the lead engine using offsets; it is not independent aircraft telemetry. Refresh failures are surfaced and can be retried. |
| Digital Twin | Improved; demonstrator-only | Adds health and RUL context, expected-versus-measured plots, numeric residuals, and deviation indicators. Nominal channel values are illustrative frontend constants, not a calibrated engine reference model. |
| Replay | Present; API-backed legacy flow | Retains the backend replay request, frame controls, speed selection, seek, and reset. Replay depends on valid timestamped telemetry and a reachable legacy API. |
| Diagnosis | Present; API-backed legacy flow | Retains backend fault classification, explanation, severity, and classifier confidence. This is separate from the V2 model/explainability pipeline. |
| Analytics | Present; API-backed legacy flow | Displays backend health, risk, residual, and uncertainty histories. These charts are legacy API histories rather than the V2 twin's history stream. |

## Completed

- Kept the existing React/Vite application, router, backend services, and page/API contracts; no replacement dashboard or new backend model was introduced.
- Made the seven requested mission screens reachable from the shared responsive command navigation.
- Added reusable health-score gauge, RUL estimate/range, and mission-recommendation components. Labels disclose the demonstrator/synthetic nature of the estimates.
- Improved mission dashboard, digital-twin residual presentation, chart legibility, keyboard focus, mobile navigation, and the existing fleet command view.
- Preserved the fleet component's five-second API refresh and surfaced failed refreshes without replacing stale data with invented success.
- Repaired the current mission provider's build failure (JSX in a `.js` hook), while clarifying that its data is mock simulation data.

## Partially complete

- **Product integration:** The active app still combines local mock screens and a legacy API workflow. The richer `src/v2/V2App.jsx` mission cockpit is not the active application entry point; it contains additional twin, prognostics, reliability, maintenance, what-if, and report workflows. These code paths should be consolidated or intentionally retired after feature-by-feature acceptance, not silently abandoned.
- **Twin visualization:** Current active Digital Twin references are frontend constants and the local telemetry generator. Backend V2 computes its own seven-channel expected/observed values, residuals, wear, reliability, and uncertainty but is not the data source for this page.
- **Fleet data:** Fleet presentation is wired to the backend V2 endpoint, but companion-aircraft readings are synthetic offsets from a single lead asset.
- **Health, RUL, confidence, and risk:** The V2 model explicitly describes its assumptions as synthetic and its confidence as heuristic. Its RUL band is an assumed sensitivity band, not a calibrated statistical interval. The active mock dashboard also uses scenario-coded estimates.
- **Analytics continuity:** The active Analytics, Diagnosis, and Replay screens query the legacy API, whereas V2 streams/persists data separately. A consistent mission ID and data lineage across those pipelines is not yet established.
- **Data acquisition:** V2 provides a telemetry-ingestion route and source selector, but ingestion requires explicit source selection and fresh, increasing timestamps. It is not evidence of a production sensor link, authenticated device onboarding, or validated aircraft integration.

## Missing or not demonstrated

- Validated aircraft/OEM limits, fleet-calibrated degradation and RUL models, representative labeled evaluation data, and uncertainty calibration.
- Production identity and role-based authorization, operator audit trails, secret/configuration management, security review, and data-retention policy.
- Operational telemetry-device integration, transport/retry/clock/sensor-quality policy, fleet registry, and independent asset identity.
- Safety-case approval and qualified human procedures before any recommendation could be used to make real mission or maintenance decisions.
- Production deployment acceptance for the complete active route tree against the intended production API, beyond local frontend build and focused browser coverage.

## Recommended deployment priorities

1. **Set the operational boundary:** Keep all synthetic screens marked as demonstration-only. Do not use current RUL, health, reliability, or recommendations for flight release or maintenance decisions.
2. **Choose and document the canonical application flow:** Decide whether the legacy API pages and V2 cockpit are both supported. Bring their navigation, telemetry sources, mission identity, and failure/retry behavior under one tested entry point.
3. **Validate model outputs before presenting them operationally:** Obtain approved reference limits and representative fleet data; independently validate classification, health, reliability, and RUL across operating envelopes, faults, sensor failures, and missing/stale data.
4. **Harden service boundaries:** Add deployment-appropriate authentication/authorization, explicit CORS and WebSocket origin policy, managed secrets, request/rate limits, persistence/backup and retention policy, structured operational logging, health/readiness probes, and alerting.
5. **Test the deployed topology:** Run all frontend unit/browser tests and backend integration tests against the actual routing, API origin, websocket, database persistence, and supported browsers. Define a release gate and rollback procedure.
6. **Verify operator UX:** Validate responsive layouts and accessible controls with representative operators; ensure stale/offline data and model uncertainty remain visible and recommendations have documented human approval workflows.

## Verification performed

- `npm test` in `frontend/`: **15 passed**.
- `npm run build` in `frontend/`: **passed**.
- Focused Playwright checks for the seven screens, fleet selection, and mobile navigation: **2 passed**.
- A full Python/backend suite and production-backend/live deployment test were not run for this frontend-focused change.
