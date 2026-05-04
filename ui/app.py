"""Counsel-in-a-Box — Streamlit Front-End for Hugging Face Spaces."""

from __future__ import annotations

import time

import httpx
import streamlit as st

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
API_BASE = "http://localhost:8080"

st.set_page_config(
    page_title="Counsel-in-a-Box",
    page_icon="&#9878;",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Styling
# ---------------------------------------------------------------------------
st.markdown(
    """
    <style>
    .severity-critical { color: #dc2626; font-weight: 700; }
    .severity-high { color: #ea580c; font-weight: 700; }
    .severity-medium { color: #ca8a04; font-weight: 600; }
    .severity-low { color: #16a34a; }
    .severity-info { color: #6b7280; }
    .agent-status { padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.85rem; }
    .status-running { background: #dbeafe; color: #1d4ed8; }
    .status-completed { background: #dcfce7; color: #15803d; }
    .status-failed { background: #fee2e2; color: #dc2626; }
    .status-pending { background: #f3f4f6; color: #6b7280; }
    </style>
    """,
    unsafe_allow_html=True,
)


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------
def severity_badge(severity: str) -> str:
    return f'<span class="severity-{severity}">{severity.upper()}</span>'


def status_badge(status: str) -> str:
    return f'<span class="agent-status status-{status}">{status}</span>'


with st.sidebar:
    st.title("Counsel-in-a-Box")
    st.caption("Legal contract review swarm on AMD MI300X")
    st.divider()
    st.subheader("Upload Deal Package")

    matter_name = st.text_input("Matter Name", placeholder="e.g., Acme Acquisition")
    uploaded_files = st.file_uploader(
        "Drop contracts here",
        accept_multiple_files=True,
        type=["txt", "pdf", "md"],
        help="Upload all documents in the deal package",
    )

    start_review = st.button(
        "Start Review",
        type="primary",
        disabled=not (matter_name and uploaded_files),
        use_container_width=True,
    )

    st.divider()
    st.markdown(
        "**Powered by**\n"
        "- AMD Instinct MI300X\n"
        "- Qwen3-32B + Qwen3.6-A3B\n"
        "- vLLM on ROCm 7\n"
        "- CrewAI"
    )


# ---------------------------------------------------------------------------
# Main area
# ---------------------------------------------------------------------------
def show_landing():
    st.markdown("# Drop a deal. Get a memo.")
    st.markdown(
        "Upload a folder of contracts and get a senior-associate-grade "
        "legal review memo in **90 seconds**. The whole deal fits in one "
        "prompt — no chunking, no RAG, no context loss."
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Context Window", "250K tokens")
    with col2:
        st.metric("Review Time", "~90 seconds")
    with col3:
        st.metric("Cross-Doc Accuracy", "23% better than RAG")

    st.divider()

    st.subheader("How It Works")
    cols = st.columns(5)
    agents_info = [
        ("Clause Extractor", "Identifies all clauses by type with citations"),
        ("Risk Scorer", "Flags deviations from market-standard language"),
        ("Obligation Tracker", "Extracts every deadline and deliverable"),
        ("Cross-Ref Auditor", "Finds contradictions across documents"),
        ("Memo Drafter", "Synthesizes everything into a partner-ready memo"),
    ]
    for col, (name, desc) in zip(cols, agents_info):
        with col:
            st.markdown(f"**{name}**")
            st.caption(desc)


def poll_matter(matter_id: str) -> dict:
    """Poll the API for matter status."""
    resp = httpx.get(f"{API_BASE}/api/matters/{matter_id}", timeout=30)
    resp.raise_for_status()
    return resp.json()


def show_results(data: dict):
    """Display the full review results."""
    st.markdown(f"# {data['name']}")
    st.markdown(status_badge(data["status"]), unsafe_allow_html=True)
    st.divider()

    # Tabs for each section
    tab_memo, tab_risks, tab_clauses, tab_obligations, tab_crossrefs = st.tabs(
        ["Memo", "Risk Findings", "Clauses", "Obligations", "Cross-References"]
    )

    with tab_memo:
        if data.get("memo_markdown"):
            st.markdown(data["memo_markdown"])

            # Download buttons
            col1, col2 = st.columns(2)
            with col1:
                st.download_button(
                    "Download Markdown",
                    data=data["memo_markdown"],
                    file_name=f"{data['name']}_memo.md",
                    mime="text/markdown",
                    use_container_width=True,
                )
            with col2:
                try:
                    docx_resp = httpx.get(
                        f"{API_BASE}/api/matters/{data['id']}/memo/docx",
                        timeout=30,
                    )
                    if docx_resp.status_code == 200:
                        st.download_button(
                            "Download DOCX",
                            data=docx_resp.content,
                            file_name=f"{data['name']}_memo.docx",
                            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            use_container_width=True,
                        )
                except httpx.HTTPError:
                    st.warning("DOCX export unavailable")
        else:
            st.info("Memo is being generated...")

    with tab_risks:
        if data.get("risks"):
            for finding in data["risks"]:
                severity = finding.get("severity", "info")
                with st.expander(
                    f'{severity.upper()} | {finding.get("clause_type", "Unknown")} '
                    f'| {finding.get("document_name", "")} {finding.get("section_ref", "")}'
                ):
                    st.markdown(f"**Deviation:** {finding.get('deviation', 'N/A')}")
                    st.markdown(f"**Market Standard:** {finding.get('market_standard', 'N/A')}")
                    st.markdown(f"**Recommendation:** {finding.get('recommendation', 'N/A')}")
                    st.caption(f"Page {finding.get('page', '?')}")
        else:
            st.info("Risk analysis in progress...")

    with tab_clauses:
        if data.get("clauses"):
            st.dataframe(
                data["clauses"],
                use_container_width=True,
                column_config={
                    "confidence": st.column_config.ProgressColumn(
                        "Confidence", min_value=0, max_value=1, format="%.0f%%"
                    ),
                },
            )
        else:
            st.info("Clause extraction in progress...")

    with tab_obligations:
        if data.get("obligations"):
            st.dataframe(data["obligations"], use_container_width=True)
        else:
            st.info("Obligation tracking in progress...")

    with tab_crossrefs:
        if data.get("crossrefs"):
            for finding in data["crossrefs"]:
                severity = finding.get("severity", "low")
                with st.expander(
                    f'{severity.upper()} | {finding.get("finding_type", "Unknown")} '
                    f'| {finding.get("document_a", "")} vs {finding.get("document_b", "")}'
                ):
                    col1, col2 = st.columns(2)
                    with col1:
                        st.markdown(f"**Document A:** {finding.get('document_a', 'N/A')}")
                        st.markdown(f"**Section:** {finding.get('section_a', 'N/A')} (p.{finding.get('page_a', '?')})")
                        st.code(finding.get("text_a", ""), language=None)
                    with col2:
                        st.markdown(f"**Document B:** {finding.get('document_b', 'N/A')}")
                        st.markdown(f"**Section:** {finding.get('section_b', 'N/A')} (p.{finding.get('page_b', '?')})")
                        st.code(finding.get("text_b", ""), language=None)
                    st.markdown(f"**Explanation:** {finding.get('explanation', 'N/A')}")
        else:
            st.info("Cross-reference audit in progress...")


# ---------------------------------------------------------------------------
# Main flow
# ---------------------------------------------------------------------------
if start_review and matter_name and uploaded_files:
    with st.spinner("Uploading documents..."):
        files = [("files", (f.name, f.getvalue(), "text/plain")) for f in uploaded_files]
        resp = httpx.post(
            f"{API_BASE}/api/matters",
            params={"name": matter_name},
            files=files,
            timeout=60,
        )
        resp.raise_for_status()
        matter = resp.json()
        st.session_state["matter_id"] = matter["id"]

if "matter_id" in st.session_state:
    matter_data = poll_matter(st.session_state["matter_id"])

    if matter_data["status"] in ("pending", "running"):
        show_results(matter_data)
        time.sleep(3)
        st.rerun()
    else:
        show_results(matter_data)
else:
    show_landing()
