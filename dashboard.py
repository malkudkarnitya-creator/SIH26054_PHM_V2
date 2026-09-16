"""SIH26054 Streamlit ground-control dashboard.

The dashboard is intentionally an orchestration and presentation layer. All
physics, residual, classification, mission, replay, and experiment behavior
continues to come from the existing ``uav_health`` package.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import TypeAlias

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from uav_health.experiment_runner import run_experiments
from uav_health.ekf import EKFEngineStateEstimator
from uav_health.fault_classifier import FaultClassifier
from uav_health.fault_injection import inject_fault
from uav_health.flight_data import REQUIRED_COLUMNS, validate_columns
from uav_health.mission_decision import MissionDecision
from uav_health.physics_model import SimplePhysicsModel
from uav_health.residual_generator import calculate_residuals
from uav_health.validation_metrics import SUPPORTED_CLASSES

Telemetry: TypeAlias = dict[str, object]

FAULT_OPTIONS = (
    "HEALTHY",
    "RPM_SENSOR_BIAS",
    "EGT_SENSOR_BIAS",
    "CHT_SENSOR_BIAS",
    "COOLING_ISSUE",
    "ENGINE_DEGRADATION",
)
INJECTION_OPTIONS = (
    "RPM_SENSOR_BIAS",
    "EGT_SENSOR_BIAS",
    "CHT_SENSOR_BIAS",
    "COOLING_FAILURE",
    "ENGINE_DEGRADATION",
)
FAULT_COLORS = {
    "HEALTHY": "#22c55e",
    "SENSOR_FAULT": "#facc15",
    "COOLING_ISSUE": "#fb923c",
    "ENGINE_DEGRADATION": "#ef4444",
}


DECISION_COLORS = {
    "CONTINUE": "#22c55e",
    "MONITOR": "#facc15",
    "DERATE": "#fb923c",
    "DIVERT": "#ef4444",
}
PLOT_TEMPLATE = "plotly_dark"
REPLAY_SPEEDS = ("0.25x", "0.5x", "1x", "2x", "4x")


def main() -> None:
    """Render the UAV ground-control station."""
    st.set_page_config(
        page_title="SKYNEX",
        page_icon="✈",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    _inject_styles()
    _render_header()
    uploaded = _render_sidebar()

    if uploaded is None:
        if not st.session_state.get("demo_mode", False):
            st.info("Upload a telemetry CSV in the sidebar or enable Demo Mode to initialize the ground station.")
            _render_flow()
            return
        telemetry = _demo_telemetry()
    else:
        try:
            telemetry = _load_csv(uploaded.getvalue())
        except (TypeError, ValueError) as error:
            st.error(f"Telemetry load failed: {error}")
            return
    if telemetry.empty:
        st.warning("The telemetry file contains no data rows.")
        return

    _ensure_state(len(telemetry))
    page = st.radio(
        "Dashboard view",
        ("Operations", "Validation Metrics", "Experiment Lab"),
        horizontal=True,
        label_visibility="collapsed",
    )
    if page == "Operations":
        _render_operations(telemetry)
    elif page == "Validation Metrics":
        _render_validation(telemetry)
    else:
        _render_experiment_lab(telemetry)


def _render_sidebar() -> object | None:
    with st.sidebar:
        st.markdown("## ✈ SKYNEX")
        st.caption("Intelligent UAV Health & Mission Assurance")
        uploaded = st.file_uploader("Telemetry CSV", type=["csv"])
        st.toggle(
            "Presentation / Demo Mode",
            key="demo_mode",
            help="Run the built-in demonstration flight when no CSV is uploaded.",
        )
        if st.session_state.get("demo_mode"):
            st.caption("Demo flight loaded with an automatic replay loop.")
        st.divider()

        st.markdown("### Replay engine")
        st.select_slider("Replay speed", options=REPLAY_SPEEDS, key="replay_speed")
        st.selectbox("Display last", ("10 samples", "50 samples", "All samples"), key="display_window")
        col_a, col_b, col_c = st.columns(3)
        if col_a.button("▶ Play", use_container_width=True):
            st.session_state.replay_playing = True
            st.session_state.replay_last_tick = time.monotonic()
        if col_b.button("⏸ Pause", use_container_width=True):
            st.session_state.replay_playing = False
        if col_c.button("⏹ Stop", use_container_width=True):
            st.session_state.replay_playing = False
            st.session_state.replay_index = 0
        st.progress(
            (st.session_state.get("replay_index", 0) + 1)
            / max(st.session_state.get("replay_length", 1), 1)
        )
        st.caption(
            f"Frame {st.session_state.get('replay_index', 0) + 1} / "
            f"{st.session_state.get('replay_length', 0)}"
        )
        st.divider()

        st.markdown("### Fault injection lab")
        st.selectbox("Fault type", INJECTION_OPTIONS, key="injection_fault")
        st.slider("Magnitude", 0, 50, 10, 1, format="%d %%", key="injection_magnitude")
        if st.button("Inject fault", type="primary", use_container_width=True):
            st.session_state.active_injection = st.session_state.injection_fault
            st.session_state.active_magnitude = float(st.session_state.injection_magnitude)
            st.toast("Fault injected; pipeline recalculated.", icon="⚠")
        if st.session_state.get("active_injection"):
            st.caption(
                f"Active scenario: {st.session_state.active_injection} "
                f"({st.session_state.active_magnitude:.0f}%)"
            )
            if st.button("Clear injected fault", use_container_width=True):
                st.session_state.active_injection = None
                st.session_state.active_magnitude = 0.0
    return uploaded


@st.cache_data(show_spinner=False)
def _load_csv(content: bytes) -> pd.DataFrame:
    """Parse and validate uploaded telemetry, caching by file content."""
    dataframe = pd.read_csv(pd.io.common.BytesIO(content))
    return validate_columns(dataframe, REQUIRED_COLUMNS)


@st.cache_resource(show_spinner=False)
def _get_pipeline_components() -> tuple[SimplePhysicsModel, FaultClassifier, MissionDecision]:
    """Reuse stateless pipeline components across Streamlit reruns."""
    return SimplePhysicsModel(), FaultClassifier(), MissionDecision()


@st.cache_data(show_spinner=False)
def _demo_telemetry() -> pd.DataFrame:
    """Create a deterministic, presentation-safe sample flight profile."""
    samples = 120
    timestamps = pd.date_range("2026-09-10 07:00:00", periods=samples, freq="s")
    progress = pd.Series(range(samples), dtype=float)
    throttle = 48 + 8 * (progress / samples) + (progress % 9) * 0.15
    altitude = 950 + progress * 1.8
    return pd.DataFrame(
        {
            "timestamp": timestamps.astype(str),
            "rpm": 3350 + throttle * 2.2 + (progress % 7) * 4,
            "egt": 535 + throttle * 0.75 + (progress % 11) * 0.8,
            "cht": 151 + throttle * 0.20 + (progress % 13) * 0.25,
            "fuel_flow": 17.5 + throttle * 0.02,
            "throttle": throttle,
            "altitude": altitude,
            "oil_temperature": 82 + progress * 0.025,
            "oil_pressure": 410 - progress * 0.08,
        }
    )


@st.cache_data(show_spinner=False)
def _analyse_cached(row_items: tuple[tuple[str, object], ...], injection: str | None, magnitude: float) -> dict[str, dict[str, object]]:
    """Run the presentation-frame pipeline once per immutable telemetry state."""
    row: Telemetry = dict(row_items)
    injected: Telemetry = row
    if injection:
        injected = inject_fault(row, injection, magnitude)
    estimator = EKFEngineStateEstimator(
        initial_state=[float(injected[field]) for field in ("rpm", "egt", "cht")]
    )
    estimate = estimator.estimate(injected)
    estimated = {
        "rpm": estimate["estimated_rpm"],
        "egt": estimate["estimated_egt"],
        "cht": estimate["estimated_cht"],
        "throttle": float(injected["throttle"]),
        "altitude": float(injected["altitude"]),
    }
    model, classifier, mission_decision = _get_pipeline_components()
    expected = model.predict({**injected, **estimated})
    residuals = calculate_residuals(estimated, expected)
    classification = classifier.classify_fault(residuals)
    decision = mission_decision.decide(
        classification["fault_type"], classification["severity"]
    )
    return {
        "injected": injected,
        "estimate": estimate,
        "estimated": estimated,
        "expected": expected,
        "residuals": residuals,
        "classification": classification,
        "decision": decision,
    }


def _analyse(row: Telemetry) -> dict[str, dict[str, object]]:
    injection = st.session_state.get("active_injection")
    if injection == "COOLING_ISSUE":
        injection = "COOLING_FAILURE"
    return _analyse_cached(tuple(row.items()), injection, float(st.session_state.get("active_magnitude", 0.0)))


@st.cache_data(show_spinner=False)
def _estimate_history(dataframe: pd.DataFrame, end_index: int) -> pd.DataFrame:
    """Estimate the replay sequence so the chart shows actual filtering."""
    estimator: EKFEngineStateEstimator | None = None
    records: list[dict[str, float | str]] = []
    for _, source_row in dataframe.iloc[: end_index + 1].iterrows():
        row = _row_mapping(source_row)
        if estimator is None:
            estimator = EKFEngineStateEstimator(
                initial_state=[float(row[field]) for field in ("rpm", "egt", "cht")]
            )
        estimate = estimator.estimate(row)
        records.append(
            {
                "timestamp": str(row["timestamp"]),
                "measured_rpm": float(row["rpm"]),
                "estimated_rpm": estimate["estimated_rpm"],
                "estimated_egt": estimate["estimated_egt"],
                "estimated_cht": estimate["estimated_cht"],
                "rpm_uncertainty": estimate["rpm_uncertainty"],
                "egt_uncertainty": estimate["egt_uncertainty"],
                "cht_uncertainty": estimate["cht_uncertainty"],
            }
        )
    return pd.DataFrame(records)


def _render_operations(dataframe: pd.DataFrame) -> None:
    _advance_replay(dataframe)
    index = st.session_state.replay_index
    row = _row_mapping(dataframe.iloc[index])
    previous = _row_mapping(dataframe.iloc[index - 1]) if index else None
    analysis = _analyse(row)
    classification = analysis["classification"]
    fault_type = str(classification["fault_type"])
    severity = str(classification["severity"])

    decision = analysis["decision"]
    _render_status_bar(
        fault_type,
        severity,
        str(decision["decision"]),
        str(row.get("timestamp", "—")),
    )
    _section_header("01", "FLIGHT TELEMETRY", "Live propulsion and airframe parameters")
    _render_kpis(
        row,
        previous,
        fault_type,
        severity,
        str(decision["decision"]),
        analysis["residuals"],
    )
    _render_state_estimation(dataframe, index, analysis["estimate"])
    if st.session_state.get("active_injection"):
        _render_injection_summary(row, analysis["injected"], fault_type)

    left, right = st.columns((1.35, 1), gap="large")
    with left:
        with st.container(border=True):
            _section_header("02", "TELEMETRY TRENDS", "Replay-synchronized engine signatures")
            _render_trends(dataframe, index)
    with right:
        with st.container(border=True):
            _section_header("03", "ENGINE HEALTH SUMMARY", "Expected state and health score")
            _render_health_summary(row, analysis["expected"], analysis["residuals"])

    left, right = st.columns((1.15, 1), gap="large")
    with left:
        with st.container(border=True):
            _section_header("04", "RESIDUAL ANALYSIS", "Deviation bands and severity assessment")
            _render_residuals(analysis["residuals"])
            _render_residual_history(dataframe, index)
    with right:
        with st.container(border=True):
            _section_header("05", "FAULT DIAGNOSIS", "Rule-based health assessment")
            _render_fault_badge(fault_type, severity, analysis["residuals"])

    with st.container(border=True):
        _section_header("06", "MISSION RECOMMENDATION CENTER", "Operational response recommendation")
        _render_decision(analysis["decision"])
    _render_flow()


if hasattr(st, "fragment"):
    _render_operations = st.fragment(run_every=0.5)(_render_operations)


def _advance_replay(dataframe: pd.DataFrame) -> None:
    if not st.session_state.get("replay_playing") or len(dataframe) < 2:
        return
    speed = float(st.session_state.replay_speed.rstrip("x"))
    interval = 0.8 / speed
    now = time.monotonic()
    if now - st.session_state.get("replay_last_tick", now) >= interval:
        st.session_state.replay_index = (st.session_state.replay_index + 1) % len(dataframe)
        st.session_state.replay_last_tick = now


def _render_kpis(
    row: Telemetry,
    previous: Telemetry | None,
    fault_type: str,
    severity: str,
    decision: str,
    residuals: dict[str, float],
) -> None:
    fields = (
        ("rpm", "RPM", "rpm"),
        ("egt", "EGT", "°C"),
        ("cht", "CHT", "°C"),
    )
    columns = st.columns(6)
    for column, (field, label, unit) in zip(columns, fields):
        if field not in row or pd.isna(row[field]):
            column.metric(label, "N/A", help="Not present in this telemetry schema")
            continue
        value = float(row[field])
        delta = None if previous is None or field not in previous else value - float(previous[field])
        arrow = "↑" if delta is not None and delta > 0.05 else "↓" if delta is not None and delta < -0.05 else "→"
        column.metric(label, f"{value:,.1f} {unit}", None if delta is None else f"{arrow} {delta:+.1f}")
    health_score = _health_score(residuals)
    fault_color = FAULT_COLORS.get(fault_type, "#94a3b8")
    decision_color = DECISION_COLORS.get(decision, "#94a3b8")
    status_cards = (
        ("ENGINE HEALTH", f"{health_score:.0f}%", "#38bdf8", "Composite residual score"),
        ("FAULT STATUS", fault_type.replace("_", " "), fault_color, "Classifier output"),
        ("MISSION DECISION", _decision_label(decision), decision_color, "Recommended action"),
    )
    for column, (label, value, color, caption) in zip(columns[3:], status_cards):
        column.markdown(
            f'<div class="kpi-status-card" style="--status-color:{color}">'
            f'<div class="kpi-status-label"><span class="kpi-icon">✦</span>{label}</div><div class="kpi-status-value">{value}</div>'
            f'<div class="kpi-status-caption">{caption}</div></div>',
            unsafe_allow_html=True,
        )
    st.caption(
        f"Frame health: **{fault_type.replace('_', ' ')}** · "
        f"{len(row)} telemetry fields available · severity {severity}"
    )


def _health_score(residuals: dict[str, float]) -> float:
    return max(0.0, min(100.0, 100.0 - sum(abs(float(value)) for value in residuals.values()) / 8.0))


def _decision_label(decision: str) -> str:
    return {
        "CONTINUE": "CONTINUE",
        "MONITOR": "CONTINUE",
        "DERATE": "REDUCE POWER",
        "DIVERT": "RETURN TO BASE",
    }.get(decision, decision)


def _render_trends(dataframe: pd.DataFrame, index: int) -> None:
    window = st.session_state.get("display_window", "All samples")
    count = {"10 samples": 10, "50 samples": 50, "All samples": len(dataframe)}[window]
    start = max(0, index - count + 1)
    plot = dataframe.iloc[start : index + 1][["timestamp", "rpm", "egt", "cht"]].copy()
    plot["timestamp"] = plot["timestamp"].astype(str)
    columns = st.columns(3)
    signals = (
        ("rpm", "RPM TREND", "#38bdf8", "RPM"),
        ("egt", "EGT TREND", "#fb923c", "°C"),
        ("cht", "CHT TREND", "#a78bfa", "°C"),
    )
    for column, (signal, title, color, unit) in zip(columns, signals):
        figure = px.line(
            plot,
            x="timestamp",
            y=signal,
            template=PLOT_TEMPLATE,
            color_discrete_sequence=[color],
            labels={signal: unit, "timestamp": ""},
        )
        figure.update_traces(line={"width": 2.5}, hovertemplate=f"%{{y:,.1f}} {unit}<extra></extra>")
        figure.update_layout(
            title={"text": title, "font": {"size": 12, "color": color}},
            height=260,
            hovermode="x unified",
            showlegend=False,
            margin=dict(l=8, r=8, t=34, b=8),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
        )
        column.plotly_chart(
            figure,
            use_container_width=True,
            config={
                "displaylogo": False,
                "scrollZoom": True,
                "modeBarButtonsToAdd": ["pan2d", "resetScale2d"],
            },
        )
    st.caption(f"Showing {len(plot)} of {len(dataframe)} samples · window: {window}")


def _render_state_estimation(
    dataframe: pd.DataFrame, index: int, estimate: dict[str, object]
) -> None:
    """Show EKF estimates, uncertainty, and measured-versus-estimated RPM."""
    with st.container(border=True):
        _section_header("03", "STATE ESTIMATION", "Noise-filtered engine state and confidence")
        cards = st.columns(6)
        for card, field, label, unit in zip(
            cards[:3],
            ("estimated_rpm", "estimated_egt", "estimated_cht"),
            ("Estimated RPM", "Estimated EGT", "Estimated CHT"),
            ("rpm", "°C", "°C"),
        ):
            card.metric(label, f"{float(estimate[field]):,.1f} {unit}")
        for card, field, label in zip(
            cards[3:],
            ("rpm_uncertainty", "egt_uncertainty", "cht_uncertainty"),
            ("RPM uncertainty", "EGT uncertainty", "CHT uncertainty"),
        ):
            card.metric(label, f"{float(estimate[field]):,.2f}")
        history = _estimate_history(dataframe, index)
        figure = px.line(
            history,
            x="timestamp",
            y=["measured_rpm", "estimated_rpm"],
            template=PLOT_TEMPLATE,
            color_discrete_sequence=["#94a3b8", "#38bdf8"],
            labels={"value": "RPM", "variable": ""},
        )
        figure.update_layout(
            height=240,
            hovermode="x unified",
            margin=dict(l=8, r=8, t=12, b=8),
            legend_title_text="",
        )
        st.plotly_chart(figure, use_container_width=True, config={"displaylogo": False})


def _render_residual_history(dataframe: pd.DataFrame, index: int) -> None:
    """Show residual evolution for the selected replay window."""
    window = st.session_state.get("display_window", "All samples")
    count = {"10 samples": 10, "50 samples": 50, "All samples": len(dataframe)}[window]
    start = max(0, index - count + 1)
    records = []
    for _, source_row in dataframe.iloc[start : index + 1].iterrows():
        analysis = _analyse(_row_mapping(source_row))
        records.append({"timestamp": str(source_row["timestamp"]), **analysis["residuals"]})
    if not records:
        return
    history = pd.DataFrame(records)
    figure = px.line(
        history,
        x="timestamp",
        y=["rpm_residual", "egt_residual", "cht_residual"],
        template=PLOT_TEMPLATE,
        color_discrete_sequence=["#38bdf8", "#fb923c", "#a78bfa"],
    )
    figure.update_layout(
        title="Residual History",
        height=220,
        hovermode="x unified",
        legend_title_text="",
        margin=dict(l=10, r=10, t=40, b=10),
    )
    st.plotly_chart(figure, use_container_width=True, config={"displaylogo": False})


def _render_comparison(row: Telemetry, expected: dict[str, float]) -> None:
    columns = st.columns(3)
    for column, (field, label, unit) in zip(
        columns, (("rpm", "RPM", "rpm"), ("egt", "EGT", "°C"), ("cht", "CHT", "°C"))
    ):
        measured = float(row[field])
        expected_value = float(expected[f"expected_{field}"])
        difference = measured - expected_value
        percent_error = (difference / expected_value * 100) if expected_value else 0.0
        maximum = max(abs(measured), abs(expected_value), 1.0) * 1.25
        figure = go.Figure(
            go.Indicator(
                mode="gauge+number",
                value=measured,
                number={"suffix": f" {unit}", "font": {"size": 24}},
                title={"text": f"{label}<br><span style='font-size:0.8em'>Expected {expected_value:.1f} · Δ {difference:+.1f} ({percent_error:+.1f}%)</span>"},
                gauge={
                    "axis": {"range": [0, maximum]},
                    "bar": {"color": "#38bdf8"},
                    "steps": [{"range": [0, maximum], "color": "#172033"}],
                },
            )
        )
        figure.update_layout(template=PLOT_TEMPLATE, height=230, margin=dict(l=10, r=10, t=44, b=4))
        column.plotly_chart(figure, use_container_width=True, config={"displaylogo": False})


def _render_health_summary(
    row: Telemetry,
    expected: dict[str, float],
    residuals: dict[str, float],
) -> None:
    """Render the digital-twin gauges and a compact aggregate health score."""
    score = _health_score(residuals)
    score_color = "#22c55e" if score >= 80 else "#facc15" if score >= 55 else "#ef4444"
    figure = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=score,
            number={"suffix": " / 100", "font": {"size": 30, "color": "#f8fafc"}},
            title={"text": "PROPULSION HEALTH SCORE", "font": {"size": 11, "color": "#8da0ba"}},
            gauge={
                "axis": {"range": [0, 100], "tickcolor": "#526580"},
                "bar": {"color": score_color, "thickness": 0.28},
                "bgcolor": "#111c2e",
                "borderwidth": 0,
                "steps": [
                    {"range": [0, 55], "color": "#241923"},
                    {"range": [55, 80], "color": "#27251b"},
                    {"range": [80, 100], "color": "#142a2a"},
                ],
            },
        )
    )
    figure.update_layout(
        template=PLOT_TEMPLATE,
        height=190,
        margin=dict(l=8, r=8, t=24, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        font={"family": "Inter, sans-serif"},
    )
    st.plotly_chart(figure, use_container_width=True, config={"displaylogo": False})
    metrics = st.columns(3)
    for metric, field, label, unit in zip(
        metrics,
        ("rpm", "egt", "cht"),
        ("EXPECTED RPM", "EXPECTED EGT", "EXPECTED CHT"),
        ("rpm", "°C", "°C"),
    ):
        measured = float(row[field])
        expected_value = float(expected[f"expected_{field}"])
        metric.markdown(
            f'<div class="expected-item"><span>{label}</span><strong>{expected_value:,.1f} {unit}</strong>'
            f'<small>Actual {measured:,.1f} {unit}</small></div>',
            unsafe_allow_html=True,
        )


def _render_injection_summary(original: Telemetry, injected: Telemetry, fault_type: str) -> None:
    """Make the simulation effect explicit for live demonstrations."""
    st.markdown("#### Fault Injection Trace")
    columns = st.columns(3)
    for column, field in zip(columns, ("rpm", "egt", "cht")):
        before = float(original[field])
        after = float(injected[field])
        column.metric(field.upper(), f"{after:,.1f}", f"{after - before:+,.1f} injected")
        column.caption(f"Original {before:,.1f} · Scenario {fault_type.replace('_', ' ')}")


def _render_residuals(residuals: dict[str, float]) -> None:
    cards = st.columns(3)
    for card, key, label, unit in zip(
        cards,
        ("rpm_residual", "egt_residual", "cht_residual"),
        ("RPM RESIDUAL", "EGT RESIDUAL", "CHT RESIDUAL"),
        ("rpm", "°C", "°C"),
    ):
        value = float(residuals[key])
        color = _residual_color(value)
        card.markdown(
            f'<div class="residual-card" style="border-top-color:{color}">'
            f'<div class="residual-label">{label}</div>'
            f'<div class="residual-value" style="color:{color}">{value:+,.1f} <span>{unit}</span></div>'
            f'<div class="residual-band">{"NORMAL" if abs(value) <= 20 else "ELEVATED" if abs(value) <= 50 else "CRITICAL"}</div>'
            "</div>",
            unsafe_allow_html=True,
        )
    frame = pd.DataFrame(
        {"parameter": ["RPM", "EGT", "CHT"], "residual": [residuals[f"{key}_residual"] for key in ("rpm", "egt", "cht")]}
    )
    frame["color"] = frame["residual"].abs().map(_residual_color)
    figure = go.Figure(
        go.Bar(
            x=frame["residual"],
            y=frame["parameter"],
            orientation="h",
            marker_color=frame["color"],
            text=frame["residual"].map(lambda value: f"{value:+.1f}"),
            textposition="outside",
            hovertemplate="%{y}: %{x:+,.1f}<extra></extra>",
        )
    )
    figure.add_vline(x=0, line_color="#cbd5e1")
    figure.update_layout(
        template=PLOT_TEMPLATE,
        height=260,
        xaxis_title="Measured − expected",
        margin=dict(l=10, r=35, t=10, b=10),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(figure, use_container_width=True, config={"displaylogo": False})
    st.caption("Severity bands: green ≤ 20 · yellow ≤ 50 · red > 50")


def _residual_color(value: float) -> str:
    magnitude = abs(float(value))
    return "#22c55e" if magnitude <= 20 else "#facc15" if magnitude <= 50 else "#ef4444"


def _render_fault_badge(
    fault_type: str,
    severity: str,
    residuals: dict[str, float],
) -> None:
    color = FAULT_COLORS.get(fault_type, "#94a3b8")
    confidence = _classification_confidence(fault_type, residuals)
    st.markdown(
        f'<div class="fault-panel" style="border-color:{color}">'
        f'<div class="fault-kicker">DETECTED FAULT</div>'
        f'<div class="fault-name" style="color:{color}">{fault_type.replace("_", " ")}</div>'
        f'<div class="fault-meta"><span class="severity-pill" style="background:{color}22;color:{color}">SEVERITY · {severity}</span>'
        f'<span class="confidence-pill">CONFIDENCE · {confidence:.0f}%</span></div>'
        f'<div class="diagnosis-copy">{_diagnosis_explanation(fault_type)}</div></div>',
        unsafe_allow_html=True,
    )


def _diagnosis_explanation(fault_type: str) -> str:
    explanations = {
        "HEALTHY": "Measured telemetry remains aligned with the physics-based expected state.",
        "SENSOR_FAULT": "Observed RPM deviation with stable thermal residuals indicates a probable sensor fault.",
        "COOLING_ISSUE": "CHT elevation with stable RPM and EGT indicates a probable cooling issue.",
        "ENGINE_DEGRADATION": "Observed RPM drop with EGT and CHT rise indicates probable engine degradation.",
    }
    return explanations.get(fault_type, "Residual signature requires operator review.")


def _classification_confidence(fault_type: str, residuals: dict[str, float]) -> float:
    """Express how strongly the current residual signature matches the rule."""
    values = {key: abs(float(value)) for key, value in residuals.items()}
    total = sum(values.values())
    if fault_type == "HEALTHY":
        return max(0.0, min(100.0, 100.0 - total / 2.0))
    return max(0.0, min(100.0, 55.0 + total / 10.0))


def _render_decision(decision: dict[str, str]) -> None:
    code = decision["decision"]
    label = {
        "CONTINUE": "CONTINUE MISSION",
        "MONITOR": "CONTINUE MISSION",
        "DERATE": "REDUCE POWER",
        "DIVERT": "RETURN TO BASE",
    }[code]
    color = DECISION_COLORS[code]
    actions = (
        ("CONTINUE MISSION", code in {"CONTINUE", "MONITOR"}, "#22c55e"),
        ("REDUCE POWER", code == "DERATE", "#fb923c"),
        ("RETURN TO BASE", code == "DIVERT", "#ef4444"),
        ("EMERGENCY LANDING", False, "#b91c1c"),
    )
    action_strip = "".join(
        f'<span class="decision-chip {"active" if active else ""}" '
        f'style="--chip-color:{chip_color}">{action}</span>'
        for action, active, chip_color in actions
    )
    st.markdown(
        f'<div class="decision-panel" style="border-left-color:{color}">'
        f'<div class="decision-label" style="color:{color}">{label}</div>'
        f'<div class="decision-reason">{decision["reason"]}</div>'
        f'<div class="decision-strip">{action_strip}</div></div>',
        unsafe_allow_html=True,
    )


def _render_validation(dataframe: pd.DataFrame) -> None:
    _section_header("V", "VALIDATION METRICS", "Deterministic benchmark across supported fault classes")
    result = _run_experiments_cached(
        tuple(_row_mapping(dataframe.iloc[-1]).items()),
        tuple(_default_experiments()),
    )
    precision = _macro(result["precision"])
    recall = _macro(result["recall"])
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
    _render_metric_cards(
        ("Accuracy", result["accuracy"]),
        ("Precision", precision),
        ("Recall", recall),
        ("F1 Score", f1),
    )
    _render_confusion(result["confusion_matrix"])


def _render_experiment_lab(dataframe: pd.DataFrame) -> None:
    _section_header("E", "EXPERIMENT LAB", "Sweep fault scenarios and export evaluation traces")
    selected = st.multiselect("Fault types", INJECTION_OPTIONS, default=list(INJECTION_OPTIONS))
    magnitudes = st.multiselect("Magnitudes (%)", (5, 10, 20, 30, 40, 50), default=[10, 30, 50])
    runs = st.number_input("Runs per scenario", min_value=1, max_value=20, value=1)
    if not selected or not magnitudes:
        st.warning("Select at least one fault type and magnitude.")
        return
    if st.button("Run experiment sweep", type="primary"):
        experiments = [
            (
                "COOLING_FAILURE" if fault == "COOLING_ISSUE" else fault,
                float(magnitude),
            )
            for fault in selected
            for magnitude in magnitudes
            for _ in range(int(runs))
        ]
        result = _run_experiments_cached(
            tuple(_row_mapping(dataframe.iloc[-1]).items()),
            tuple(experiments),
        )
        st.session_state.experiment_result = result
    result = st.session_state.get("experiment_result")
    if result:
        precision = _macro(result["precision"])
        recall = _macro(result["recall"])
        f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
        _render_metric_cards(
            ("Accuracy", result["accuracy"]),
            ("Precision", precision),
            ("Recall", recall),
            ("F1 Score", f1),
        )
        _render_confusion(result["confusion_matrix"])
        details = pd.DataFrame(result["experiment_details"])
        st.dataframe(details, use_container_width=True, hide_index=True)
        st.download_button("Export CSV", details.to_csv(index=False), "experiment_results.csv", "text/csv")
        st.download_button("Export JSON", json.dumps(result, indent=2), "experiment_results.json", "application/json")


def _render_confusion(matrix: object) -> None:
    frame = pd.DataFrame(matrix).T.reindex(index=SUPPORTED_CLASSES, columns=SUPPORTED_CLASSES).fillna(0)
    figure = px.imshow(
        frame,
        text_auto=True,
        color_continuous_scale=[[0, "#111827"], [0.5, "#2563eb"], [1, "#22c55e"]],
        template=PLOT_TEMPLATE,
        labels={"x": "Predicted", "y": "Actual", "color": "Count"},
    )
    figure.update_layout(height=430, margin=dict(l=10, r=10, t=30, b=10))
    st.plotly_chart(figure, use_container_width=True, config={"displaylogo": False})


def _render_metric_cards(*metrics: tuple[str, object]) -> None:
    columns = st.columns(len(metrics))
    for column, (label, value) in zip(columns, metrics):
        column.metric(label, f"{float(value):.1%}")


@st.cache_data(show_spinner=False)
def _run_experiments_cached(
    row_items: tuple[tuple[str, object], ...],
    experiments: tuple[tuple[str, float], ...],
) -> dict[str, object]:
    """Cache deterministic validation runs across UI reruns."""
    return run_experiments(dict(row_items), experiments)


def _macro(values: object) -> float:
    return sum(float(value) for value in values.values()) / len(values) if isinstance(values, dict) and values else 0.0


def _default_experiments() -> list[tuple[str, float]]:
    return [("NO_FAULT", 0), ("RPM_SENSOR_BIAS", 400), ("COOLING_FAILURE", 30), ("ENGINE_DEGRADATION", 400)]


def _row_mapping(row: pd.Series[object]) -> Telemetry:
    return {str(field): value for field, value in row.items()}


def _ensure_state(length: int) -> None:
    st.session_state.setdefault("replay_index", 0)
    st.session_state.setdefault("replay_playing", False)
    st.session_state.setdefault("replay_speed", "1x")
    st.session_state.setdefault("replay_last_tick", time.monotonic())
    st.session_state.setdefault("active_injection", None)
    st.session_state.setdefault("active_magnitude", 0.0)
    st.session_state.replay_length = length
    st.session_state.replay_index = min(st.session_state.replay_index, length - 1)


def _render_header() -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC")
    st.markdown(
        '<div class="hero"><div class="brand-mark">✈</div><div class="hero-copy">'
        '<div class="eyebrow">SKYNEX · UAV PROPULSION HEALTH</div>'
        '<h1>SKYNEX</h1>'
        '<p>Intelligent UAV Health &amp; Mission Assurance</p>'
        '</div><div class="hero-meta"><div class="operational"><span></span><strong>SYSTEM OPERATIONAL</strong>'
        '<small>GROUND STATION ONLINE</small></div><div class="mission-ready">MISSION READINESS <b>READY</b></div>'
        f'<div class="hero-time">LIVE TIMESTAMP<br><b>{timestamp}</b></div></div></div>',
        unsafe_allow_html=True,
    )


def _section_header(index: str, title: str, subtitle: str) -> None:
    """Render a compact GCS section heading with a consistent visual rhythm."""
    st.markdown(
        f'<div class="section-heading"><span class="section-index">{index}</span>'
        f'<div><div class="section-title">{title}</div><div class="section-subtitle">{subtitle}</div></div></div>',
        unsafe_allow_html=True,
    )


def _render_status_bar(
    fault_type: str,
    severity: str,
    decision: str,
    timestamp: str,
) -> None:
    """Render the four high-salience aircraft health indicators."""
    status = "HEALTHY" if fault_type == "HEALTHY" else "DEGRADED"
    status_color = "#22c55e" if status == "HEALTHY" else FAULT_COLORS.get(fault_type, "#facc15")
    severity_color = {
        "LOW": "#22c55e",
        "MEDIUM": "#facc15",
        "HIGH": "#ef4444",
    }.get(severity, "#94a3b8")
    decision_color = DECISION_COLORS.get(decision, "#94a3b8")
    items = (
        ("SYSTEM STATUS", status, status_color),
        ("CURRENT FAULT", fault_type.replace("_", " "), status_color),
        ("SEVERITY", severity, severity_color),
        ("MISSION DECISION", decision, decision_color),
    )
    cards = "".join(
        f'<div class="status-item"><div class="status-label">{label}</div>'
        f'<div class="status-reading"><span class="status-dot" style="background:{color}"></span>{value}</div></div>'
        for label, value, color in items
    )
    st.markdown(
        f'<div class="status-bar">{cards}<div class="live-tag">LIVE · {timestamp}</div></div>',
        unsafe_allow_html=True,
    )


def _render_flow() -> None:
    st.markdown(
        '<div class="pipeline"><div>CSV<br><small>Telemetry</small></div><b>→</b><div>PHYSICS<br><small>Expected state</small></div>'
        '<b>→</b><div>RESIDUAL<br><small>Deviation</small></div><b>→</b><div>FAULT<br><small>Classification</small></div>'
        '<b>→</b><div>DECISION<br><small>Mission action</small></div></div>',
        unsafe_allow_html=True,
    )


def _inject_styles() -> None:
    st.markdown(
        """<style>
        :root { color-scheme: dark; }
        html, body, [data-testid="stAppViewContainer"] { background:#030712 !important; }
        .stApp { background:linear-gradient(135deg,#030712 0%,#0f172a 52%,#111827 100%); color:#e6eefb; min-height:100vh; }
        .stApp::before,.stApp::after { content:""; position:fixed; pointer-events:none; border-radius:50%; filter:blur(90px); opacity:.20; z-index:0; }
        .stApp::before { width:420px; height:420px; background:#00d4ff; top:-160px; left:18%; }
        .stApp::after { width:500px; height:500px; background:#6c63ff; right:-180px; bottom:-180px; }
        [data-testid="stAppViewContainer"]::before { content:""; position:fixed; width:360px; height:360px; border-radius:50%; background:#4f8cff; filter:blur(110px); opacity:.14; left:-170px; top:42%; pointer-events:none; }
        header[data-testid="stHeader"], [data-testid="stToolbar"], #MainMenu, footer { visibility:hidden; height:0; }
        .block-container { max-width: 1680px; padding: 1.1rem 3rem 4rem; position:relative; z-index:1; }
        [data-testid="stMetric"] { background:linear-gradient(145deg,rgba(23,39,65,.82),rgba(11,22,39,.72)); border:1px solid rgba(94,135,183,.2); border-radius:18px; padding:16px 17px; box-shadow:0 14px 36px rgba(0,0,0,.18); transition:transform .2s ease,border-color .2s ease; }
        [data-testid="stMetric"]:hover { transform:translateY(-2px); border-color:rgba(56,189,248,.65); }
        [data-testid="stMetricLabel"] { color:#8da0ba; font-size:.69rem; text-transform:uppercase; letter-spacing:.11em; font-weight:700; }
        [data-testid="stMetricValue"] { color:#f8fafc; font-size:1.3rem; letter-spacing:-.02em; }
        [data-testid="stMetricDelta"] { font-size:.68rem; }
        .kpi-status-card { min-height:78px; padding:14px 15px; border-radius:18px; background:linear-gradient(145deg,rgba(23,39,65,.82),rgba(11,22,39,.72)); border:1px solid color-mix(in srgb, var(--status-color) 35%, transparent); box-shadow:0 14px 36px rgba(0,0,0,.18); transition:transform .2s ease,border-color .2s ease; }
        .kpi-status-card:hover { transform:translateY(-2px); border-color:var(--status-color); }
        .kpi-status-label { color:#8da0ba; font-size:.62rem; letter-spacing:.1em; font-weight:700; display:flex; gap:6px; align-items:center; }
        .kpi-icon { color:var(--status-color); font-size:.85rem; }
        .kpi-status-value { color:var(--status-color); font-size:1.05rem; font-weight:800; margin-top:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .kpi-status-caption { color:#637995; font-size:.61rem; margin-top:5px; }
        .hero { display:flex; align-items:center; gap:18px; padding:16px 0 28px; border-bottom:1px solid rgba(77,112,155,.22); margin-bottom:22px; }
        .brand-mark { display:grid; place-items:center; width:58px; height:58px; border-radius:18px; background:linear-gradient(145deg,#164a78,#10233f); color:#5ed9ff; font-size:28px; box-shadow:0 0 30px rgba(45,184,255,.16); }
        .hero-copy { min-width:0; }
        .hero-meta { margin-left:auto; display:flex; align-items:center; gap:22px; }
        .mission-ready,.hero-time { color:#7890ad; font-size:.58rem; letter-spacing:.1em; font-weight:700; text-align:right; line-height:1.6; }
        .mission-ready b { color:#22c55e; font-size:.68rem; }
        .hero-time b { color:#d8e7f8; font-size:.65rem; }
        .eyebrow,.fault-kicker { color:#38bdf8; font-size:.72rem; letter-spacing:.16em; font-weight:700; }
        .hero h1 { margin:4px 0 6px; font-size:1.8rem; color:#f8fafc; letter-spacing:-.035em; }
        .hero p { margin:0; color:#91a5bf; font-size:.78rem; }
        .operational { color:#86efac; font-size:.68rem; font-weight:700; letter-spacing:.1em; display:flex; align-items:center; gap:5px; flex-direction:column; }
        .operational small { color:#607692; font-size:.58rem; letter-spacing:.12em; }
        .operational span,.status-dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:7px; box-shadow:0 0 10px currentColor; }
        .section-heading { display:flex; align-items:center; gap:11px; margin:26px 0 12px; padding-bottom:9px; border-bottom:1px solid #1d2b43; }
        .section-index { color:#38bdf8; font:700 .68rem ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing:.08em; }
        .section-title { color:#f8fafc; font-size:.86rem; font-weight:800; letter-spacing:.13em; }
        .section-subtitle { color:#64748b; font-size:.72rem; margin-top:2px; }
        .system-banner,.decision-panel,.fault-panel,.status-bar { background:linear-gradient(145deg,rgba(18,34,57,.86),rgba(10,20,35,.76)); border:1px solid rgba(101,143,190,.22); border-radius:18px; padding:18px 20px; box-shadow:0 18px 42px rgba(0,0,0,.18); }
        .system-banner { display:flex; align-items:center; gap:4px; margin-bottom:18px; }
        .status-bar { display:grid; grid-template-columns:repeat(4,1fr) auto; gap:16px; align-items:center; margin-bottom:22px; padding:14px 18px; }
        .status-item { border-right:1px solid rgba(90,126,166,.22); padding-right:16px; }
        .status-label { color:#6f849e; font-size:.61rem; font-weight:700; letter-spacing:.12em; }
        .status-reading { color:#e2e8f0; font-size:.8rem; font-weight:800; margin-top:5px; white-space:nowrap; }
        .status-reading .status-dot { margin-right:6px; }
        .status-value { margin-left:8px; color:#e2e8f0; font-weight:700; }
        .live-tag { margin-left:auto; color:#64748b; font-size:.75rem; }
        .fault-panel { text-align:center; border-width:1px; min-height:214px; display:flex; flex-direction:column; justify-content:center; }
        .fault-name { font-size:1.48rem; font-weight:800; margin:10px 0 14px; letter-spacing:-.02em; }
        .fault-meta { display:flex; justify-content:center; align-items:center; gap:8px; flex-wrap:wrap; }
        .severity-pill { display:inline-block; border-radius:99px; padding:5px 11px; font-size:.72rem; font-weight:700; letter-spacing:.08em; }
        .confidence-pill { display:inline-block; color:#cbd5e1; background:#16243a; border:1px solid #2b405d; border-radius:99px; padding:5px 11px; font-size:.72rem; font-weight:700; letter-spacing:.08em; }
        .residual-card { background:#111d31; border:1px solid #263652; border-top:3px solid; border-radius:9px; padding:11px 12px; margin-bottom:12px; }
        .residual-label { color:#7f91aa; font-size:.65rem; letter-spacing:.1em; font-weight:700; }
        .residual-value { font-size:1.2rem; font-weight:800; margin-top:4px; }
        .residual-value span { color:#64748b; font-size:.7rem; font-weight:600; }
        .residual-band { color:#64748b; font-size:.61rem; letter-spacing:.1em; margin-top:4px; }
        .diagnosis-copy { color:#9fb0c6; background:rgba(7,15,28,.42); border:1px solid rgba(93,129,171,.18); border-radius:12px; padding:11px 13px; margin-top:18px; font-size:.76rem; line-height:1.55; text-align:left; }
        .expected-item { background:rgba(10,21,37,.64); border:1px solid rgba(89,129,172,.18); border-radius:12px; padding:9px 10px; min-height:72px; }
        .expected-item span,.expected-item small { display:block; color:#6f849e; font-size:.58rem; letter-spacing:.08em; font-weight:700; }
        .expected-item strong { display:block; color:#eef6ff; font-size:.85rem; margin:5px 0; }
        .expected-item small { color:#8ea2bc; letter-spacing:0; font-weight:400; }
        .decision-panel { border-left-width:6px; min-height:142px; }
        .decision-label { font-size:1.55rem; font-weight:800; letter-spacing:-.03em; }
        .decision-reason { color:#cbd5e1; margin-top:9px; line-height:1.5; }
        .decision-strip { display:flex; flex-wrap:wrap; gap:6px; margin-top:16px; }
        .decision-chip { color:#70819a; border:1px solid #293b56; border-radius:999px; padding:4px 8px; font-size:.6rem; font-weight:800; letter-spacing:.07em; }
        .decision-chip.active { color:var(--chip-color); border-color:var(--chip-color); background:color-mix(in srgb, var(--chip-color) 13%, transparent); }
        .pipeline { display:flex; align-items:center; justify-content:space-between; gap:10px; background:#0f192a; border:1px solid #263652; border-radius:12px; padding:16px 22px; margin-top:20px; color:#38bdf8; text-align:center; }
        .pipeline b { color:#475569; font-size:1.3rem; }
        .pipeline small { color:#94a3b8; font-size:.7rem; }
        section[data-testid="stSidebar"] { background:linear-gradient(180deg,rgba(7,20,38,.94),rgba(3,10,22,.97)); border-right:1px solid rgba(77,112,155,.25); backdrop-filter:blur(24px); }
        div[data-testid="stSidebar"] { background:transparent; }
        div[data-testid="stSidebar"] h2 { color:#f1f7ff; letter-spacing:-.03em; }
        div[data-testid="stSidebar"] .stMarkdown h3 { color:#6e87a5; font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; }
        div[data-testid="stSidebar"] .stButton > button { border:1px solid rgba(79,126,176,.3); background:linear-gradient(145deg,#122642,#0e1d31); border-radius:10px; transition:all .2s ease; }
        div[data-testid="stSidebar"] .stButton > button:hover { border-color:#38bdf8; color:#f8fafc; }
        div[data-testid="stSidebar"] [data-testid="stFileUploaderDropzone"] { background:rgba(15,35,58,.55); border:1px dashed #31577d; border-radius:13px; }
        div[data-testid="stRadio"] > div { background:rgba(13,28,48,.7); border:1px solid rgba(72,116,161,.25); border-radius:14px; padding:4px; }
        div[data-testid="stRadio"] label { font-size:.75rem; color:#9eb1c9; }
        div[data-testid="stRadio"] label:has(input:checked) { color:#eaf6ff; }
        .stDownloadButton > button { border-radius:10px; border-color:#2d557c; }
        [data-testid="stVerticalBlockBorderWrapper"] { background:linear-gradient(145deg,rgba(17,35,59,.6),rgba(8,18,32,.5)); border-color:rgba(94,135,183,.22); border-radius:20px; box-shadow:0 20px 50px rgba(0,0,0,.16); }
        [data-testid="stHorizontalBlock"] { gap: .75rem; }
        .stCaption { color:#7186a3; }
        div[data-testid="stAlert"] { border-radius:16px; background:rgba(15,35,58,.66); border:1px solid rgba(79,140,255,.25); }
        @media (max-width: 1100px) { .block-container { padding-left:1.3rem; padding-right:1.3rem; } .status-bar { grid-template-columns:repeat(2,1fr); } .status-item:nth-child(2) { border-right:0; } .status-bar .live-tag { grid-column:span 2; } }
        @media (max-width: 700px) { .hero { align-items:flex-start; } .hero h1 { font-size:1.25rem; } .hero-meta { display:none; } .status-bar { grid-template-columns:1fr; } .status-item { border-right:0; border-bottom:1px solid #263652; padding:0 0 8px; } .status-bar .live-tag { grid-column:auto; } }
        </style>""",
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
