# streamlit_app.py — Innovest Guard Control Tower (Dark UI, Logo Header)
# Run:  streamlit run streamlit_app.py

import base64
from copy import deepcopy
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import streamlit as st

# =============================
# Page config (wide) + safe cache clear
# =============================
st.set_page_config(page_title="Innovest Guard — Control Tower", layout="wide")
try:
    st.cache_data.clear()
    st.cache_resource.clear()
except Exception:
    pass

# =============================
# Dark theme CSS (high contrast, readable)
# =============================
DARK_CSS = """
<style>
:root {
  --bg:#0b1220;          /* page background */
  --panel:#111827;       /* cards/panels */
  --ink:#e5e7eb;         /* primary text */
  --muted:#9ca3af;       /* secondary text */
  --line:#1f2937;        /* borders */
  --brand:#60a5fa;       /* accent */
}
html, body, .stApp { background: var(--bg) !important; color: var(--ink) !important; }
[data-testid="stHeader"] { background: var(--bg) !important; }
h1,h2,h3,h4 { font-weight:800; letter-spacing:-.015em; color:var(--ink) !important; }
.small { color: var(--muted) !important; font-size:.9rem; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:16px; box-shadow:0 1px 2px rgba(0,0,0,.25); }
.kpi { background:#0f172a; border:1px solid var(--line); border-radius:12px; padding:10px 12px; }
.chip { display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; border:1px solid var(--line); }
.chip.ok    { background:#0b2536; color:#a5e4ff; border-color:#123042;}
.chip.pause { background:#1d1535; color:#c4b5fd; border-color:#2a1f52;}
.stTabs [data-baseweb="tab-list"] { gap:8px; }
.stTabs [data-baseweb="tab"] { background:#0f172a; border:1px solid var(--line); border-radius:999px; padding:6px 12px; color:var(--ink) !important; }
.stTabs [data-baseweb="tab"][aria-selected="true"] { border-color: var(--brand) !important; box-shadow: inset 0 -2px 0 0 var(--brand) !important; }
[data-testid="stRadio"] label { color: var(--ink) !important; }
[data-testid="stMetricValue"], [data-testid="stMetricLabel"], [data-testid="stMetricDelta"] { color: var(--ink) !important; opacity: 1 !important; }
[data-testid="stDataFrame"] * { color: var(--ink) !important; }
[data-testid="stDataFrame"] thead, [data-testid="stDataFrame"] tbody, [data-testid="stDataFrame"] table { background: #0f172a !important; }
[data-testid="stDataFrame"] th, [data-testid="stDataFrame"] td { border-color: var(--line) !important; }
[data-testid="stTable"] * { color: var(--ink) !important; }
[data-testid="stTable"] table { background:#0f172a !important; }
[data-testid="stTable"] th, [data-testid="stTable"] td { border-color: var(--line) !important; }
[data-testid="stExpander"] * { color: var(--ink) !important; }
.brand { display:flex; align-items:center; gap:.6rem; }
.brand img { height:28px; }
.brand .title { font-weight:900; font-size:1.1rem; letter-spacing:-.02em; }
section.main > div { padding-top: .5rem; }
hr { border:none; border-top:1px solid var(--line); margin:0.5rem 0 1rem; }
.banner { background:#2a153a; border:1px solid #3b2460; border-radius:12px; padding:8px 12px; }
</style>
"""
st.markdown(DARK_CSS, unsafe_allow_html=True)

# =============================
# Config: policy thresholds (TRUST + VALUE)
# =============================
DEFAULT_THRESHOLDS = {
    # TRUST (responsible AI)
    "False Alarms (%)": {"op": "<", "threshold": 5.0},
    "Fairness Ratio (×)": {"op": "<", "threshold": 1.20},
    "Model Drift (score)": {"op": "<", "threshold": 0.30},
    "Explainability (score)": {"op": ">", "threshold": 0.70},

    # VALUE (bank-centric)
    "Fraud Loss ($)": {"op": "<", "threshold": 200_000},
    "Customer Satisfaction (%)": {"op": ">", "threshold": 85.0},
    "Resolution Time (min)": {"op": "<", "threshold": 20},
}

# =============================
# Seed systems (value/trust + ops context)
# =============================
INITIAL_MODELS = [
    {
        "System": "FraudDetect v3",
        "Owner": "Payments Risk",
        "Model Owner": "M. Smith (Dir. Payments Risk)",
        "Accountable Executive": "VP, Enterprise Risk",
        "Type": "Classifier",
        "Status": "RUNNING",
        # TRUST
        "False Alarms (%)": 3.2,
        "Fairness Ratio (×)": 1.08,
        "Model Drift (score)": 0.12,
        "Explainability (score)": 0.76,
        # VALUE
        "Fraud Loss ($)": 180_000,
        "Customer Satisfaction (%)": 86,
        "Resolution Time (min)": 18,
        # Ops
        "Monthly Volume": 250_000,
        "Avg Ticket ($)": 85,
    },
    {
        "System": "CreditScore v2",
        "Owner": "Credit Risk",
        "Model Owner": "S. Johnson (Head of Credit Models)",
        "Accountable Executive": "CRO",
        "Type": "Scoring",
        "Status": "RUNNING",
        # TRUST
        "False Alarms (%)": 4.1,
        "Fairness Ratio (×)": 1.15,
        "Model Drift (score)": 0.18,
        "Explainability (score)": 0.72,
        # VALUE
        "Fraud Loss ($)": 90_000,
        "Customer Satisfaction (%)": 88,
        "Resolution Time (min)": 14,
        # Ops
        "Monthly Volume": 120_000,
        "Avg Ticket ($)": 0,
    },
    {
        "System": "CareBot v5",
        "Owner": "Customer Care",
        "Model Owner": "J. Robinson (LLM Platform Lead)",
        "Accountable Executive": "COO, Retail",
        "Type": "LLM Assistant",
        "Status": "RUNNING",
        # TRUST
        "False Alarms (%)": 0.0,
        "Fairness Ratio (×)": 1.02,
        "Model Drift (score)": 0.10,
        "Explainability (score)": 0.74,
        # VALUE
        "Fraud Loss ($)": 60_000,
        "Customer Satisfaction (%)": 88,
        "Resolution Time (min)": 16,
        # Ops
        "Monthly Volume": 1_800_000,
        "Avg Ticket ($)": 0,
    },
    # --- Innovest AI: Financial AI Support ---
    {
        "System": "Financial AI Support",
        "Owner": "Advisory Services",
        "Model Owner": "T. Nguyen (Head of AI Support)",
        "Accountable Executive": "COO, Wealth",
        "Type": "LLM Assistant",
        "Status": "RUNNING",
        # TRUST
        "False Alarms (%)": 0.5,
        "Fairness Ratio (×)": 1.04,
        "Model Drift (score)": 0.11,
        "Explainability (score)": 0.75,
        # VALUE
        "Fraud Loss ($)": 40_000,
        "Customer Satisfaction (%)": 90,
        "Resolution Time (min)": 12,
        # Ops
        "Monthly Volume": 850_000,
        "Avg Ticket ($)": 0,
    },
]

ROLES = ["Executive", "Risk/Compliance", "Engineer", "Auditor", "Customer"]

# =============================
# Session state
# =============================
ss = st.session_state
if "models" not in ss:
    ss.models = [m.copy() for m in INITIAL_MODELS]
if "audit" not in ss:
    ss.audit = []
if "paused" not in ss:
    ss.paused = set()
if "role" not in ss:
    ss.role = ROLES[0]
if "policy_meta" not in ss:
    ss.policy_meta = {"version": "1.0.0", "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
if "baselines" not in ss:
    ss.baselines = {m["System"]: deepcopy(m) for m in INITIAL_MODELS}
if "customer_notifications" not in ss:
    ss.customer_notifications = []
if "customer_profile" not in ss:
    ss.customer_profile = {
        "name": "Jordan",
        "language": "English",
        "channel": "In-App",
        "accessibility": "Standard",
        "consent_marketing": False,
        "consent_risk_alerts": True,
        "preferred_tone": "Reassuring",
    }
if "logo_bytes" not in ss:
    ss.logo_bytes = None  # holds uploaded logo bytes

# =============================
# Helpers
# =============================
def policy_version() -> str:
    return ss.policy_meta.get("version", "0.0.0")

def record(event: str, system: str, meta=None) -> None:
    ss.audit.append({
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "system": system,
        "event": event,
        "policy_version": policy_version(),
        "role": ss.role,
        "details": meta or {},
    })

def sync_status_from_paused() -> None:
    for m in ss.models:
        m["Status"] = "PAUSED" if m["System"] in ss.paused else "RUNNING"

def _violates(val, rule) -> bool:
    op, thr = rule["op"], rule["threshold"]
    if op == "<":
        return not (val < thr)
    return not (val > thr)

def check_controls(row: pd.Series, thresholds: dict):
    failures = []
    for metric, rule in thresholds.items():
        if metric not in row:
            continue
        if _violates(row[metric], rule):
            failures.append((metric, row[metric], rule["op"], rule["threshold"]))
    return failures

def _translate(msg_en: str) -> str:
    lang = ss.customer_profile.get("language", "English")
    if lang == "Español":
        table = {
            "Temporary service pause": "Pausa temporal del servicio",
            "Service restored": "Servicio restaurado",
            "We noticed unusual activity and temporarily paused this service to keep you safe.": "Detectamos actividad inusual y pausamos temporalmente este servicio para protegerte.",
            "We’re checking data and will restore service after a quick review.": "Estamos verificando los datos y restauraremos el servicio tras una revisión rápida.",
        }
        for k, v in table.items():
            msg_en = msg_en.replace(k, v)
    return msg_en

def format_explanation(system: str, failures) -> str:
    tone = ss.customer_profile.get("preferred_tone", "Reassuring")
    large = ss.customer_profile.get("accessibility") == "Large Text"
    base1 = "We noticed unusual activity and temporarily paused this service to keep you safe."
    details = "; ".join([f"{m} was {v} (policy {op} {thr})" for m, v, op, thr in failures])
    base2 = "We’re checking data and will restore service after a quick review."
    msg = f"{base1} Why: {details}. {base2}"
    if tone == "Concise":
        msg = f"Paused for safety. Cause: {details}. Restoring after checks."
    if large:
        msg = f"**{msg}**"
    return _translate(msg)

def new_notification(system: str, title: str, message: str) -> str:
    nid = f"n{len(ss.customer_notifications)+1:04d}"
    channel = ss.customer_profile.get("channel", "In-App")
    ss.customer_notifications.append({
        "id": nid,
        "system": system,
        "title": _translate(title),
        "message": message,
        "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "UNREAD",
        "channel": channel,
    })
    return nid

def enforce_policies_auto() -> None:
    df_tmp = pd.DataFrame(ss.models)
    for _, row in df_tmp.iterrows():
        system = row["System"]
        failures = check_controls(row, DEFAULT_THRESHOLDS)
        if failures and system not in ss.paused:
            ss.paused.add(system)
            sync_status_from_paused()
            record("auto_pause", system, {"failures": failures, "mode": "auto"})
            new_notification(system, "Temporary service pause", format_explanation(system, failures))

def gate_pass(row: dict, metrics: list) -> bool:
    for m in metrics:
        if m in DEFAULT_THRESHOLDS and m in row:
            if _violates(row[m], DEFAULT_THRESHOLDS[m]):
                return False
    return True

def _get_system(name: str):
    for m in ss.models:
        if m["System"] == name:
            return m
    return None

# =============================
# Header (brand + role)
# =============================
def render_brand(logo_path: str | None = None, logo_url: str | None = None, logo_bytes: bytes | None = None) -> None:
    """Renders compact brand row with logo (uploaded bytes, file path, or URL)."""
    logo_html = ""
    if logo_bytes:
        logo_html = f"<img src='data:image/png;base64,{base64.b64encode(logo_bytes).decode()}' alt='Innovest Guard'/>"
    elif logo_path and Path(logo_path).exists():
        b64 = Path(logo_path).read_bytes()
        logo_html = f"<img src='data:image/png;base64,{base64.b64encode(b64).decode()}' alt='Innovest Guard'/>"
    elif logo_url:
        logo_html = f"<img src='{logo_url}' alt='Innovest Guard'/>"
    title = "<span class='title'>Innovest Guard — Value & Trust Control Tower</span>"
    st.markdown(f"<div class='brand'>{logo_html}{title}</div>", unsafe_allow_html=True)
    st.markdown(
        "<div class='small'>Detect risk → auto-pause → engineer fixes → risk approval → evidence → savings. Customers stay informed.</div>",
        unsafe_allow_html=True,
    )

top_left, top_right = st.columns([0.66, 0.34])
with top_right:
    up = st.file_uploader("Upload logo (PNG/SVG/JPG)", type=["png", "svg", "jpg", "jpeg"])
    if up is not None:
        ss.logo_bytes = up.read()

render_brand(logo_path="logo.png", logo_url=None, logo_bytes=ss.logo_bytes)

role_col = st.columns([0.66, 0.34])[1]
with role_col:
    ss.role = st.radio("Role", options=ROLES, index=ROLES.index(ss.role), horizontal=True)
ROLE = ss.role

ROLE_TABS = {
    "Executive": ["Overview", "Value Savings", "Audit"],
    "Risk/Compliance": ["Overview", "Systems", "Reviews", "Value Savings", "Regulators", "Audit"],
    "Engineer": ["Overview", "Systems", "Reviews", "Audit"],
    "Auditor": ["Overview", "Regulators", "Audit"],
    "Customer": ["Customer", "Profile"],
}

# Always re-evaluate policies & show banner
enforce_policies_auto()
sync_status_from_paused()

paused_names = sorted(list(ss.paused))
if paused_names:
    st.markdown(f"<div class='banner'>🚨 <b>Paused systems:</b> {', '.join(paused_names)} — awaiting remediation & risk approval.</div>", unsafe_allow_html=True)

ALL_TABS = ["Overview","Systems","Reviews","Value Savings","Regulators","Audit","Customer","Profile"]
render_tabs = [t for t in ALL_TABS if t in ROLE_TABS[ROLE]]
containers = st.tabs(render_tabs)
TAB = dict(zip(render_tabs, containers))

# =============================
# Overview
# =============================
if "Overview" in TAB:
    with TAB["Overview"]:
        sync_status_from_paused()
        df = pd.DataFrame(ss.models)
        paused_count = len(ss.paused)
        running = len(ss.models) - paused_count
        total = len(ss.models)
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Systems", f"{total}")
        c2.metric("Running", f"{running}")
        c3.metric("Paused", f"{paused_count}")
        fails = sum(1 for _, r in df.iterrows() if check_controls(r, DEFAULT_THRESHOLDS))
        c4.metric("Non-Compliant", f"{fails}")

        st.markdown("### Fleet status")
        display_cols = [
            "System", "Owner", "Type", "Status",
            "Fraud Loss ($)", "Customer Satisfaction (%)", "Resolution Time (min)",
            "False Alarms (%)", "Fairness Ratio (×)", "Model Drift (score)",
        ]
        display = df[display_cols].copy()

        def comp_row(row_):
            bad = check_controls(row_, DEFAULT_THRESHOLDS)
            return "⚠️ Non-Compliant" if bad else "OK"

        display.insert(3, "Compliance", [comp_row(df.loc[i]) for i in df.index])
        st.dataframe(display, use_container_width=True)

# =============================
# Systems (inventory + incident simulator + Innovest guided remediation)
# =============================
if "Systems" in TAB:
    with TAB["Systems"]:
        st.markdown("### Connected AI Systems")
        df = pd.DataFrame(ss.models)
        view_cols = [
            "System", "Owner", "Model Owner", "Accountable Executive", "Type", "Status"
        ]
        st.dataframe(df[view_cols], use_container_width=True)

        if ROLE in ("Engineer", "Risk/Compliance"):
            st.markdown("#### Incident Simulator (internal)")
            c1, c2, c3 = st.columns(3)

            # Existing demo spikes
            with c1:
                if st.button("Bias Spike — CreditScore v2"):
                    tgt = _get_system("CreditScore v2")
                    if tgt:
                        tgt["Fairness Ratio (×)"] = 1.34
                        tgt["False Alarms (%)"] = 6.7
                        tgt["Fraud Loss ($)"] = min(tgt.get("Fraud Loss ($)", 90_000) + 40_000, 999_999)
                        record("metric_update", tgt["System"], {
                            "Fairness Ratio (×)": tgt["Fairness Ratio (×)"],
                            "False Alarms (%)": tgt["False Alarms (%)"],
                            "Fraud Loss ($)": tgt["Fraud Loss ($)"]
                        })
                        enforce_policies_auto()
                        st.success("Injected: auto-pause + customer notification sent.")

            with c2:
                if st.button("Model Drift — FraudDetect v3"):
                    tgt = _get_system("FraudDetect v3")
                    if tgt:
                        tgt["Model Drift (score)"] = 0.44
                        tgt["Fraud Loss ($)"] = min(tgt.get("Fraud Loss ($)", 180_000) + 60_000, 999_999)
                        tgt["Resolution Time (min)"] = max(tgt.get("Resolution Time (min)", 18) + 4, 0)
                        record("metric_update", tgt["System"], {
                            "Model Drift (score)": tgt["Model Drift (score)"],
                            "Fraud Loss ($)": tgt["Fraud Loss ($)"],
                            "Resolution Time (min)": tgt["Resolution Time (min)"]
                        })
                        enforce_policies_auto()
                        st.success("Injected: auto-pause + customer notification sent.")

            # Innovest AI (Financial AI Support) — clear "violations" trigger with inline feedback
            with c3:
                st.markdown("**Demo: Trigger policy violations on Innovest AI**")
                if st.button("Trigger Policy Violations — Innovest AI (Financial AI Support)"):
                    target = _get_system("Financial AI Support")
                    if target is None:
                        st.error("Could not find system 'Financial AI Support'. Make sure it exists in INITIAL_MODELS.")
                    else:
                        before = {
                            "Fairness Ratio (×)": target.get("Fairness Ratio (×)"),
                            "False Alarms (%)": target.get("False Alarms (%)"),
                            "Model Drift (score)": target.get("Model Drift (score)"),
                            "Explainability (score)": target.get("Explainability (score)"),
                            "Fraud Loss ($)": target.get("Fraud Loss ($)"),
                            "Resolution Time (min)": target.get("Resolution Time (min)"),
                            "Customer Satisfaction (%)": target.get("Customer Satisfaction (%)"),
                        }

                        # Push metrics past thresholds (simulate a governance/policy event)
                        target["Fairness Ratio (×)"]     = 1.35   # > 1.20
                        target["False Alarms (%)"]       = 7.2    # > 5.0
                        target["Model Drift (score)"]    = 0.41   # > 0.30
                        target["Explainability (score)"] = 0.65   # < 0.70
                        target["Fraud Loss ($)"]         = min(target.get("Fraud Loss ($)", 40_000) + 50_000, 999_999)
                        target["Resolution Time (min)"]  = max(0, target.get("Resolution Time (min)", 12) + 6)
                        target["Customer Satisfaction (%)"] = max(0.0, min(100.0, target.get("Customer Satisfaction (%)", 90) - 5.0))

                        record("metric_update", target["System"], {
                            "Fairness Ratio (×)": target["Fairness Ratio (×)"],
                            "False Alarms (%)": target["False Alarms (%)"],
                            "Model Drift (score)": target["Model Drift (score)"],
                            "Explainability (score)": target["Explainability (score)"],
                            "Fraud Loss ($)": target["Fraud Loss ($)"],
                            "Resolution Time (min)": target["Resolution Time (min)"],
                            "Customer Satisfaction (%)": target["Customer Satisfaction (%)"],
                        })

                        # Policy check -> auto-pause + customer notice
                        enforce_policies_auto()
                        sync_status_from_paused()

                        failures = check_controls(pd.Series(target), DEFAULT_THRESHOLDS)
                        st.error("Innovest AI policy violations triggered:")
                        for mtr, val, op, thr in failures:
                            st.write(f"• **{mtr}** = {val} (policy {op} {thr})")

                        after = {
                            "Fairness Ratio (×)": target.get("Fairness Ratio (×)"),
                            "False Alarms (%)": target.get("False Alarms (%)"),
                            "Model Drift (score)": target.get("Model Drift (score)"),
                            "Explainability (score)": target.get("Explainability (score)"),
                            "Fraud Loss ($)": target.get("Fraud Loss ($)"),
                            "Resolution Time (min)": target.get("Resolution Time (min)"),
                            "Customer Satisfaction (%)": target.get("Customer Satisfaction (%)"),
                        }
                        st.markdown("**Before/After (key metrics)**")
                        st.table(pd.DataFrame({"Before": before, "After": after}))

                        paused_now = "Financial AI Support" in ss.paused
                        st.info(f"Status: {'PAUSED (as expected)' if paused_now else 'RUNNING (unexpected)'}")
                        st.success("Auto-pause + customer notification were invoked.")

            # Guided remediation for Innovest AI
            with st.expander("Guided Remediation — Innovest AI (Financial AI Support)", expanded=False):
                col_a, col_b, col_c = st.columns(3)

                with col_a:
                    if st.button("Engineer Apply Fixes (Innovest AI)"):
                        target = _get_system("Financial AI Support")
                        if target:
                            if "Fairness Ratio (×)" in target:
                                target["Fairness Ratio (×)"] = min(target.get("Fairness Ratio (×)", 1.35), 1.12)
                            if "False Alarms (%)" in target:
                                target["False Alarms (%)"] = min(target.get("False Alarms (%)", 7.2), 4.9)
                            if "Model Drift (score)" in target:
                                target["Model Drift (score)"] = min(target.get("Model Drift (score)", 0.41), 0.22)
                            if "Explainability (score)" in target:
                                target["Explainability (score)"] = max(target.get("Explainability (score)", 0.65), 0.72)
                            if "Fraud Loss ($)" in target:
                                target["Fraud Loss ($)"] = max(0, target.get("Fraud Loss ($)", 90_000) - 40_000)
                            if "Resolution Time (min)" in target:
                                target["Resolution Time (min)"] = max(0, target.get("Resolution Time (min)", 18) - 4)
                            if "Customer Satisfaction (%)" in target:
                                target["Customer Satisfaction (%)"] = min(100.0, target.get("Customer Satisfaction (%)", 85) + 3.0)

                            record("remediation_applied", target["System"], {"notes": "Guided remediation demo"})
                            enforce_policies_auto()
                            st.success("Fixes applied to Innovest AI. System remains PAUSED pending Risk approval.")

                with col_b:
                    if st.button("Risk Approve Resume (Innovest AI)"):
                        name = "Financial AI Support"
                        if name in ss.paused:
                            ss.paused.remove(name)
                        tgt = _get_system(name)
                        if tgt:
                            tgt["Status"] = "RUNNING"
                            record("approve_resume", name, {"notes": "Guided remediation approved"})
                            new_notification(name, "Service restored", _translate("Service restored"))
                            st.success("Risk approval recorded. Innovest AI resumed.")

                with col_c:
                    if st.button("Reset Innovest AI to Baseline"):
                        base = ss.baselines.get("Financial AI Support")
                        if base:
                            for m in ss.models:
                                if m["System"] == "Financial AI Support":
                                    for k, v in base.items():
                                        m[k] = deepcopy(v)
                            if "Financial AI Support" in ss.paused:
                                ss.paused.remove("Financial AI Support")
                            sync_status_from_paused()
                            record("reset_to_baseline", "Financial AI Support", {})
                            st.success("Innovest AI restored to baseline and resumed.")

# =============================
# Reviews (HITL)
# =============================
if "Reviews" in TAB:
    with TAB["Reviews"]:
        st.markdown("### Review & Approvals (Human-in-the-Loop)")
        st.caption("Engineers remediate; Risk/Compliance approves resume. VALUE & TRUST gates must pass.")

        names = [m["System"] for m in ss.models]
        sel = st.selectbox("Select a system", options=names)
        row = next(m for m in ss.models if m["System"] == sel)
        status = "PAUSED" if sel in ss.paused else "RUNNING"

        cA, cB = st.columns([0.62, 0.38])
        with cA:
            st.markdown(f"#### {row['System']} — {row['Type']}")
            st.write(f"**Owner:** {row['Owner']} · **Model Owner:** {row['Model Owner']} · **Accountable Exec:** {row['Accountable Executive']}")

            status_html = "<span class='chip pause'>PAUSED</span>" if status == "PAUSED" else "<span class='chip ok'>RUNNING</span>"
            st.markdown(f"**Status:** {status_html} · **Policy v{policy_version()}**", unsafe_allow_html=True)

            VALUE = ["Fraud Loss ($)", "Customer Satisfaction (%)", "Resolution Time (min)"]
            TRUST = ["False Alarms (%)", "Fairness Ratio (×)", "Model Drift (score)", "Explainability (score)"]

            def gate_table(title: str, metrics: list) -> bool:
                ok = gate_pass(row, metrics)
                st.markdown(f"**{title}** — {'PASS' if ok else 'FAIL'}")
                data = {
                    "Metric": metrics,
                    "Value": [row.get(k, np.nan) for k in metrics],
                    "Policy": [f"{DEFAULT_THRESHOLDS[k]['op']} {DEFAULT_THRESHOLDS[k]['threshold']}" for k in metrics],
                }
                st.table(pd.DataFrame(data))
                return ok

            _ = gate_table("VALUE (Business)", VALUE)
            _ = gate_table("TRUST (Responsible AI)", TRUST)

            viol = check_controls(row, DEFAULT_THRESHOLDS)
            if viol:
                st.error("Violations:")
                for mtr, val, op, thr in viol:
                    st.write(f"• **{mtr}** = {val} (policy {op} {thr})")
            else:
                st.success("No policy violations detected.")

        with cB:
            notes = st.text_area("Reviewer/Engineer notes", height=120)
            allow_fix = ROLE in ("Engineer", "Risk/Compliance")
            allow_approve = ROLE == "Risk/Compliance"

            if st.button("Apply Fixes (Engineer)", disabled=not allow_fix):
                changed = False
                for m in ss.models:
                    if m["System"] in ss.paused:
                        if "Fairness Ratio (×)" in m:
                            m["Fairness Ratio (×)"] = min(m.get("Fairness Ratio (×)", 0), 1.12)
                        if "False Alarms (%)" in m:
                            m["False Alarms (%)"] = min(m.get("False Alarms (%)", 0), 4.9)
                        if "Model Drift (score)" in m:
                            m["Model Drift (score)"] = min(m.get("Model Drift (score)", 0), 0.22)
                        if "Fraud Loss ($)" in m:
                            m["Fraud Loss ($)"] = max(0, m.get("Fraud Loss ($)", 0) - 40_000)
                        if "Resolution Time (min)" in m:
                            m["Resolution Time (min)"] = max(0, m.get("Resolution Time (min)", 0) - 4)
                        if "Customer Satisfaction (%)" in m:
                            m["Customer Satisfaction (%)"] = min(100.0, m.get("Customer Satisfaction (%)", 0) + 2)
                        changed = True
                if changed:
                    record("remediation_applied", sel, {"notes": notes})
                    enforce_policies_auto()
                    st.success("Fixes applied. System remains PAUSED pending Risk approval.")
                else:
                    st.info("No paused systems to fix.")

            c1, c2 = st.columns(2)
            with c1:
                if st.button("Approve Resume (Risk)", disabled=not allow_approve):
                    if sel in ss.paused:
                        ss.paused.remove(sel)
                    for m in ss.models:
                        if m["System"] == sel:
                            m["Status"] = "RUNNING"
                    record("approve_resume", sel, {"notes": notes})
                    new_notification(sel, "Service restored", _translate("Service restored"))
                    st.success("Approved: system resumed.")
            with c2:
                if st.button("Keep Paused", disabled=not allow_approve):
                    ss.paused.add(sel)
                    for m in ss.models:
                        if m["System"] == sel:
                            m["Status"] = "PAUSED"
                    record("reject_keep_paused", sel, {"notes": notes})
                    st.warning("System remains paused.")

# =============================
# Value Savings (simple ΔFraud Loss − remediation)
# =============================
if "Value Savings" in TAB:
    with TAB["Value Savings"]:
        st.markdown("### Estimated Monthly Savings (from governance improvements)")
        st.caption("Simple: (Baseline Fraud Loss − Current Fraud Loss) − Remediation / N months. Snapshot is logged for audit.")

        names = [m["System"] for m in ss.models]
        sel = st.selectbox("System", options=names)
        row = next(m for m in ss.models if m["System"] == sel)
        baseline = ss.baselines.get(sel, {})

        loss0 = float(baseline.get("Fraud Loss ($)", 0))
        loss1 = float(row.get("Fraud Loss ($)", 0))

        c = st.columns(2)
        remediation = c[0].number_input("Remediation cost ($)", min_value=0, value=5_000)
        amort_n    = c[1].number_input("Amortize remediation over N months", min_value=1, value=1)
        rem_per_month = remediation / max(1, amort_n)

        delta_loss = max(0.0, loss0 - loss1)
        total = delta_loss - rem_per_month

        st.metric("Estimated monthly savings", f"${total:,.0f}")
        with st.expander("See calculation details"):
            st.write({
                "baseline_fraud_loss_$": loss0,
                "current_fraud_loss_$": loss1,
                "delta_loss_$": round(delta_loss, 2),
                "remediation_per_month_$": round(rem_per_month, 2),
                "net_monthly_savings_$": round(total, 2),
            })

        if st.button("Log savings to audit"):
            record("value_savings_logged", sel, {
                "baseline_fraud_loss_$": round(loss0, 2),
                "current_fraud_loss_$": round(loss1, 2),
                "delta_loss_$": round(delta_loss, 2),
                "net_monthly_savings_$": round(total, 2),
                "assumptions": {"remediation": remediation, "amort_months": amort_n},
            })
            st.success("Logged to audit.")

# =============================
# Regulators
# =============================
if "Regulators" in TAB:
    with TAB["Regulators"]:
        st.markdown("### Regulator Dashboard")
        st.caption("Record briefings and evidence packs. Entries are policy-stamped in the audit log.")
        col = st.columns(2)
        if col[0].button("Record quarterly briefing"):
            record("reg_briefing_recorded", "GLOBAL", {})
            st.success("Briefing recorded.")
        if col[1].button("Mark evidence pack sent"):
            record("evidence_pack_sent", "GLOBAL", {"contents": ["policy snapshot", "model cards", "audit slice", "remediation summary"]})
            st.success("Evidence pack recorded.")

# =============================
# Audit
# =============================
if "Audit" in TAB:
    with TAB["Audit"]:
        st.markdown("### Audit Log & Exports")
        cols = ["time", "system", "event", "policy_version", "role", "details"]
        log_df = pd.DataFrame(ss.audit)[cols] if ss.audit else pd.DataFrame(columns=cols)
        st.dataframe(log_df, use_container_width=True, height=320)
        if not log_df.empty:
            st.download_button("Download audit_log.csv", data=log_df.to_csv(index=False).encode("utf-8"), file_name="audit_log.csv", mime="text/csv")
        # Simple model card export for the first system
        if ss.models:
            current = ss.models[0]
            status_txt = "PAUSED" if current["System"] in ss.paused else "RUNNING"
            VALUE = ["Fraud Loss ($)", "Customer Satisfaction (%)", "Resolution Time (min)"]
            TRUST = ["False Alarms (%)", "Fairness Ratio (×)", "Model Drift (score)", "Explainability (score)"]
            card_lines = [
                f"Model Card — {current['System']}",
                f"Owner: {current['Owner']}",
                f"Model Owner: {current['Model Owner']}",
                f"Accountable Executive: {current['Accountable Executive']}",
                f"Type: {current['Type']}",
                f"Status: {status_txt}",
                f"Policy Version: {policy_version()} (updated {ss.policy_meta['last_updated']})",
                f"VALUE Gate: {'PASS' if gate_pass(current, VALUE) else 'FAIL'}",
                f"TRUST Gate: {'PASS' if gate_pass(current, TRUST) else 'FAIL'}",
                "Metrics vs Policy:",
            ]
            for k, rule in DEFAULT_THRESHOLDS.items():
                v = current.get(k, "n/a")
                card_lines.append(f"- {k}: {v} (policy {rule['op']} {rule['threshold']})")
            st.download_button(
                "Download model_card.txt",
                data=("\n".join(card_lines)).encode("utf-8"),
                file_name=f"model_card_{current['System'].replace(' ', '_')}.txt",
                mime="text/plain"
            )

# =============================
# Customer Portal
# =============================
if "Customer" in TAB:
    with TAB["Customer"]:
        st.markdown("### Service Status Portal")
        st.caption("Personalized notices and simple actions. No internal metrics.")
        if not ss.customer_notifications:
            st.info("No new notifications.")
        else:
            for note in reversed(ss.customer_notifications):
                exp_label = f"{note['title']} — {note['system']} · {note['ts']} [{note['status']}] ({note['channel']})"
                with st.expander(exp_label, expanded=False):
                    st.write(note["message"])
                    c1, c2, c3 = st.columns(3)
                    if c1.button(f"Acknowledge {note['id']}"):
                        note["status"] = "ACKNOWLEDGED"
                        st.success("Thanks — noted.")
                    if note["system"].startswith("FraudDetect"):
                        if c2.button(f"It was me {note['id']}"):
                            for m in ss.models:
                                if m["System"] == note["system"]:
                                    m["False Alarms (%)"] = max(0.0, m.get("False Alarms (%)", 0.0) - 0.5)
                                    m["Customer Satisfaction (%)"] = min(100.0, m.get("Customer Satisfaction (%)", 0.0) + 2.0)
                                    m["Resolution Time (min)"] = max(0, m.get("Resolution Time (min)", 0) - 2)
                            record("customer_confirm", note["system"], {"notification_id": note["id"]})
                            st.success("We’ve updated your case.")
                        if c3.button(f"Not me {note['id']}"):
                            record("customer_denied", note["system"], {"notification_id": note["id"]})
                            st.warning("We’ve escalated this as potential fraud.")
                    elif note["system"].startswith("CreditScore"):
                        if c2.button(f"Request review {note['id']}"):
                            record("customer_request_review", note["system"], {"notification_id": note["id"]})
                            st.success("We’ve flagged your application for a human review.")

        st.divider()
        st.markdown("#### Quick actions")
        svc = st.selectbox("Choose a service", [m["System"] for m in ss.models])
        paused = svc in ss.paused
        st.metric("Status", "Temporarily paused" if paused else "Running normally")
        c1, c2 = st.columns(2)
        if svc.startswith("FraudDetect"):
            if c1.button("It was me"):
                for m in ss.models:
                    if m["System"] == svc:
                        m["False Alarms (%)"] = max(0.0, m.get("False Alarms (%)", 0.0) - 0.5)
                        m["Customer Satisfaction (%)"] = min(100.0, m.get("Customer Satisfaction (%)", 0.0) + 2.0)
                        m["Resolution Time (min)"] = max(0, m.get("Resolution Time (min)", 0) - 2)
                record("customer_confirm", svc, {"source": "actions"})
                st.success("Thanks — updated.")
            if c2.button("Not me"):
                record("customer_denied", svc, {"source": "actions"})
                st.warning("Escalated to fraud specialists.")
        elif svc.startswith("CreditScore"):
            if c1.button("Request manual review"):
                record("customer_request_review", svc, {"source": "actions"})
                st.success("We’ve flagged this for a quick human review.")

# =============================
# Profile (personalization)
# =============================
if "Profile" in TAB:
    with TAB["Profile"]:
        st.markdown("### Customer Personalization")
        p = ss.customer_profile
        c1, c2, c3 = st.columns(3)
        p["name"] = c1.text_input("Name", value=p.get("name", "Jordan"))
        p["language"] = c2.selectbox("Language", options=["English", "Español"], index=["English", "Español"].index(p.get("language", "English")))
        p["channel"] = c3.selectbox("Preferred channel", options=["In-App", "SMS", "Email"], index=["In-App", "SMS", "Email"].index(p.get("channel", "In-App")))
        c4, c5, c6 = st.columns(3)
        p["accessibility"] = c4.selectbox("Accessibility", options=["Standard", "Large Text"], index=["Standard", "Large Text"].index(p.get("accessibility", "Standard")))
        p["preferred_tone"] = c5.selectbox("Tone", options=["Reassuring", "Concise"], index=["Reassuring", "Concise"].index(p.get("preferred_tone", "Reassuring")))
        p["consent_marketing"] = c6.checkbox("Consent — Marketing comms", value=p.get("consent_marketing", False))
        p["consent_risk_alerts"] = st.checkbox("Consent — Risk alerts", value=p.get("consent_risk_alerts", True))
        st.success("Preferences saved. Future notifications will reflect these choices.")

# =============================
# Footer / Reset
# =============================
with st.expander("Reset demo", expanded=False):
    if st.button("Reset to initial state"):
        ss.models = [m.copy() for m in INITIAL_MODELS]
        ss.audit = []
        ss.paused = set()
        ss.customer_notifications = []
        sync_status_from_paused()
        st.success("Demo reset. Reload if the table doesn't refresh.")

st.caption("Innovest Guard • Detection -> Auto-Pause -> Engineer fixes -> Risk approval -> Evidence -> Savings. Customer: personalized notices & simple actions.")
