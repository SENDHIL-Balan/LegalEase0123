import streamlit as st
import datetime
import json
import os
import requests
from typing import List, Dict, Any

# Configure Page
st.set_page_config(
    page_title="LegalEase AI | Enterprise Legal Document Workspace",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Enterprise CSS
CUSTOM_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap');

:root {
    --primary: #0f172a;
    --primary-light: #1e293b;
    --accent: #b45309;
    --accent-light: #fef3c7;
    --surface: #ffffff;
    --background: #f8fafc;
    --border: #e2e8f0;
    --text-main: #0f172a;
    --text-muted: #64748b;
    --card-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
}

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--text-main);
}

/* Header & Navigation Polish */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}

/* Custom Brand Header in Sidebar */
.brand-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0 20px 0;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 16px;
}
.brand-logo {
    font-size: 26px;
    background: #0f172a;
    color: #f59e0b;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.brand-title {
    font-weight: 700;
    font-size: 20px;
    color: #0f172a;
    letter-spacing: -0.02em;
    line-height: 1.1;
}
.brand-tag {
    font-size: 10px;
    font-weight: 600;
    color: #b45309;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

/* Dashboard Cards */
.metric-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    box-shadow: var(--card-shadow);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.metric-card:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.08);
}
.metric-title {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 8px;
}
.metric-value {
    font-size: 32px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.02em;
}

/* Document Paper Preview */
.legal-paper {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 48px 56px;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06);
    font-family: 'Newsreader', Georgia, serif;
    color: #1e293b;
    line-height: 1.7;
    font-size: 15.5px;
    margin: 16px 0;
}
.legal-title {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    text-align: center;
    color: #0f172a;
    letter-spacing: -0.01em;
    margin-bottom: 4px;
}
.legal-meta {
    text-align: center;
    font-style: italic;
    font-size: 13.5px;
    color: #64748b;
    margin-bottom: 28px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 16px;
}
.legal-parties-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 16px 20px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    margin-bottom: 24px;
}
.legal-heading {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 24px;
    margin-bottom: 8px;
    letter-spacing: 0.02em;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 4px;
}
.legal-paragraph {
    text-align: justify;
    margin-bottom: 14px;
}
.legal-disclaimer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #94a3b8;
    font-style: italic;
    font-family: 'Plus Jakarta Sans', sans-serif;
}

/* Stepper Bar */
.stepper-container {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 14px;
}
.step-item {
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
}
.step-item.active {
    color: #0f172a;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 12px;
}
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

# Initialize Session State
if "documents" not in st.session_state:
    st.session_state["documents"] = []
if "current_doc" not in st.session_state:
    st.session_state["current_doc"] = None
if "wizard_step" not in st.session_state:
    st.session_state["wizard_step"] = 1
if "wizard_data" not in st.session_state:
    st.session_state["wizard_data"] = {
        "document_type": "Freelance Work Contract",
        "parties": [
            {"name": "", "company": "", "role": "Contractor", "address": "", "email": "", "phone": ""},
            {"name": "", "company": "", "role": "Client", "address": "", "email": "", "phone": ""}
        ],
        "terms": [""],
        "effective_date": "",
        "jurisdiction": "State of California",
        "additional_instructions": "",
        "document_language": "English",
        "tone": "Formal & Binding"
    }

# Connect with internal backend services
from ai_core.gemini_generator import generate_legal_document
from backend.schemas.document import DocumentRequest, Party, StructuredDocument, Section, KeyTerm, SignatureBlock
from backend.services.document_service import list_documents, save_document, get_templates, update_document, delete_document
from backend.services.export_service import export_document

# Sidebar Navigation
with st.sidebar:
    st.markdown("""
    <div class="brand-header">
        <div class="brand-logo">⚖</div>
        <div>
            <div class="brand-title">LegalEase AI</div>
            <div class="brand-tag">Enterprise Legal SaaS</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    nav = st.radio(
        "Navigation",
        ["Dashboard", "Create Document", "My Documents", "Templates", "Settings", "Help & Disclaimer"],
        label_visibility="collapsed"
    )

    st.markdown("---")
    st.markdown("""
    <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
        <strong>LegalEase AI Workspace</strong><br>
        Version 2.4.0 (Enterprise)<br>
        AI Core: Google Gemini Active
    </div>
    """, unsafe_allow_html=True)


# ==========================================
# 1. DASHBOARD
# ==========================================
if nav == "Dashboard":
    st.markdown("""
    <div style="margin-bottom: 24px;">
        <h1 style="font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Good morning, Legal Counsel</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">What would you like to create today?</p>
    </div>
    """, unsafe_allow_html=True)

    # Metric Row
    all_docs = list_documents()
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-title">Documents Created</div>
            <div class="metric-value">{len(all_docs)}</div>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-title">Active Drafts</div>
            <div class="metric-value">1</div>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-title">Available Templates</div>
            <div class="metric-value">7</div>
        </div>
        """, unsafe_allow_html=True)
    with col4:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-title">Compliance Audit</div>
            <div class="metric-value" style="color: #16a34a;">100%</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Primary Action Banner
    c_btn1, c_btn2 = st.columns([1, 4])
    with c_btn1:
        if st.button("+ Create Document", type="primary", use_container_width=True):
            st.session_state["wizard_step"] = 1
            st.session_state["nav"] = "Create Document"
            st.rerun()

    st.markdown("<h3 style='font-size: 18px; font-weight: 600; color: #0f172a; margin: 28px 0 16px 0;'>Recent Documents</h3>", unsafe_allow_html=True)
    
    if all_docs:
        for doc in all_docs[:5]:
            with st.container():
                rc1, rc2, rc3, rc4 = st.columns([3, 2, 2, 2])
                with rc1:
                    st.markdown(f"**{doc.title}**<br><span style='font-size: 12px; color: #64748b;'>{doc.document_type}</span>", unsafe_allow_html=True)
                with rc2:
                    st.markdown(f"<span style='font-size: 13px; color: #334155;'>{doc.parties_summary}</span>", unsafe_allow_html=True)
                with rc3:
                    st.markdown(f"<span style='font-size: 12px; color: #64748b;'>Effective: {doc.effective_date} (v{doc.version})</span>", unsafe_allow_html=True)
                with rc4:
                    if st.button(f"Open Document", key=f"dash_open_{doc.id}"):
                        from backend.services.document_service import get_document
                        full_doc = get_document(doc.id)
                        if full_doc:
                            st.session_state["current_doc"] = full_doc
                            st.session_state["wizard_step"] = 6
                            st.session_state["nav"] = "Create Document"
                            st.rerun()
                st.markdown("<hr style='margin: 8px 0; border: none; border-top: 1px solid #f1f5f9;'>", unsafe_allow_html=True)
    else:
        st.info("No documents generated yet. Click '+ Create Document' to start.")


# ==========================================
# 2. CREATE DOCUMENT (MULTI-STEP WIZARD)
# ==========================================
elif nav == "Create Document":
    step = st.session_state["wizard_step"]

    # Stepper Indicator
    steps = [
        ("1", "Document Type"),
        ("2", "Parties"),
        ("3", "Terms & Conditions"),
        ("4", "Effective Date"),
        ("5", "Review"),
        ("6", "Document Workspace")
    ]
    step_html = '<div class="stepper-container">'
    for num, label in steps:
        active_class = "active" if str(step) == num else ""
        step_html += f'<div class="step-item {active_class}">Step {num}: {label}</div>'
    step_html += '</div>'
    st.markdown(step_html, unsafe_allow_html=True)

    w_data = st.session_state["wizard_data"]

    # STEP 1: CHOOSE DOCUMENT TYPE
    if step == 1:
        st.markdown("<h2 style='font-size: 20px; font-weight: 700; margin-bottom: 6px;'>Step 1: Choose Document Type</h2>", unsafe_allow_html=True)
        st.markdown("<p style='color: #64748b; font-size: 14px;'>Select the category of legal instrument to draft.</p>", unsafe_allow_html=True)

        doc_types = [
            ("Freelance Work Contract", "Independent contractor agreement covering scope, milestones, deliverables, IP ownership, and fee schedule."),
            ("Employment Contract", "Full-time employment agreement establishing duties, base compensation, annual bonus, benefits, and at-will terms."),
            ("Non-Disclosure Agreement (NDA)", "Confidentiality instrument safeguarding proprietary business data, trade secrets, software code, and disclosures."),
            ("Commercial & Residential Lease", "Real estate agreement covering premises, rental rates, deposits, maintenance obligations, and covenants."),
            ("Employment Offer Letter", "Executive or staff offer letter summarizing position, starting salary, equity options, and acceptance deadline."),
            ("Master Services Agreement (MSA)", "Comprehensive business-to-business commercial agreement with SLA definitions and liability limits."),
            ("General Business Agreement", "Flexible bilateral contract for strategic partnerships, joint ventures, or vendor agreements.")
        ]

        cols = st.columns(2)
        for i, (dtype, ddesc) in enumerate(doc_types):
            with cols[i % 2]:
                with st.container():
                    st.markdown(f"""
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 12px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #0f172a;">{dtype}</h4>
                        <p style="font-size: 12.5px; color: #64748b; margin: 0 0 12px 0; min-height: 38px;">{ddesc}</p>
                    </div>
                    """, unsafe_allow_html=True)
                    if st.button(f"Select {dtype}", key=f"sel_dt_{i}"):
                        w_data["document_type"] = dtype
                        st.session_state["wizard_step"] = 2
                        st.rerun()

    # STEP 2: PARTIES
    elif step == 2:
        st.markdown("<h2 style='font-size: 20px; font-weight: 700; margin-bottom: 6px;'>Step 2: Parties Involved</h2>", unsafe_allow_html=True)
        st.markdown(f"<p style='color: #64748b; font-size: 14px;'>Define the participating legal entities for <strong>{w_data['document_type']}</strong>.</p>", unsafe_allow_html=True)

        parties = w_data["parties"]
        for idx, p in enumerate(parties):
            st.markdown(f"<h4 style='font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 16px;'>Party {chr(65 + idx)} ({p.get('role', 'Party')})</h4>", unsafe_allow_html=True)
            c1, c2, c3 = st.columns(3)
            with c1:
                p["name"] = st.text_input(f"Full Legal Name *", value=p.get("name", ""), key=f"p_name_{idx}")
                p["company"] = st.text_input(f"Company / Organization", value=p.get("company", ""), key=f"p_comp_{idx}")
            with c2:
                p["role"] = st.text_input(f"Role / Designation", value=p.get("role", "Party"), key=f"p_role_{idx}")
                p["address"] = st.text_input(f"Registered Address", value=p.get("address", ""), key=f"p_addr_{idx}")
            with c3:
                p["email"] = st.text_input(f"Email Address", value=p.get("email", ""), key=f"p_email_{idx}")
                p["phone"] = st.text_input(f"Phone Number", value=p.get("phone", ""), key=f"p_phone_{idx}")

        col_a, col_b = st.columns([1, 4])
        with col_a:
            if st.button("+ Add Party"):
                parties.append({"name": "", "company": "", "role": "Signatory", "address": "", "email": "", "phone": ""})
                st.rerun()

        st.markdown("---")
        btn_c1, btn_c2 = st.columns([1, 1])
        with btn_c1:
            if st.button("← Back to Document Type"):
                st.session_state["wizard_step"] = 1
                st.rerun()
        with btn_c2:
            if st.button("Continue to Terms →", type="primary"):
                if not any(p["name"].strip() for p in parties):
                    st.error("Please provide at least one valid party name.")
                else:
                    st.session_state["wizard_step"] = 3
                    st.rerun()

    # STEP 3: TERMS & CONDITIONS
    elif step == 3:
        st.markdown("<h2 style='font-size: 20px; font-weight: 700; margin-bottom: 6px;'>Step 3: Agreed Terms & Conditions</h2>", unsafe_allow_html=True)
        st.markdown("<p style='color: #64748b; font-size: 14px;'>Enter the commercial covenants, payment conditions, or obligations.</p>", unsafe_allow_html=True)

        terms = w_data["terms"]
        for idx, t in enumerate(terms):
            c_t1, c_t2 = st.columns([6, 1])
            with c_t1:
                terms[idx] = st.text_input(f"Term {idx + 1:02d}", value=t, key=f"term_input_{idx}")
            with c_t2:
                st.markdown("<div style='height: 28px;'></div>", unsafe_allow_html=True)
                if st.button("Delete", key=f"del_term_{idx}"):
                    terms.pop(idx)
                    st.rerun()

        col_t1, col_t2 = st.columns(2)
        with col_t1:
            if st.button("+ Add Another Term"):
                terms.append("")
                st.rerun()

        # Advanced Semicolon importer
        with st.expander("Import Semicolon-Separated Terms"):
            st.caption("Paste terms separated by semicolons (;) for batch import.")
            semi_input = st.text_area("Paste terms here", placeholder="Payment within 30 days; Confidentiality for 3 years; Termination on 15 days notice")
            if st.button("Import Pasted Terms"):
                if semi_input.strip():
                    new_terms = [s.strip() for s in semi_input.split(";") if s.strip()]
                    w_data["terms"] = new_terms
                    st.success(f"Imported {len(new_terms)} terms.")
                    st.rerun()

        st.markdown("---")
        b1, b2 = st.columns([1, 1])
        with b1:
            if st.button("← Back to Parties"):
                st.session_state["wizard_step"] = 2
                st.rerun()
        with b2:
            if st.button("Continue to Effective Date →", type="primary"):
                st.session_state["wizard_step"] = 4
                st.rerun()

    # STEP 4: EFFECTIVE DATE & ADVANCED SETTINGS
    elif step == 4:
        st.markdown("<h2 style='font-size: 20px; font-weight: 700; margin-bottom: 6px;'>Step 4: Effective Date & Governance</h2>", unsafe_allow_html=True)

        c1, c2 = st.columns(2)
        with c1:
            curr_d = datetime.date.today()
            date_val = st.date_input("Effective Date", value=curr_d)
            w_data["effective_date"] = date_val.strftime("%B %d, %Y")

            w_data["jurisdiction"] = st.selectbox(
                "Governing Jurisdiction / Law",
                [
                    "State of California",
                    "State of Delaware",
                    "State of New York",
                    "State of Texas",
                    "State of Washington",
                    "Commonwealth of Massachusetts",
                    "United Kingdom / England & Wales",
                    "General / Mutual Jurisdiction"
                ],
                index=0
            )

        with c2:
            w_data["document_language"] = st.selectbox("Document Language", ["English", "Spanish", "French", "German"])
            w_data["tone"] = st.selectbox("Drafting Tone", ["Formal & Binding", "Collaborative Standard", "Executive Concise"])

        with st.expander("Advanced Instructions & Special Clauses"):
            w_data["additional_instructions"] = st.text_area(
                "Special stipulations or custom covenants",
                value=w_data.get("additional_instructions", ""),
                placeholder="E.g., include non-solicitation clause for 12 months, arbitration in San Francisco."
            )

        st.markdown("---")
        b1, b2 = st.columns([1, 1])
        with b1:
            if st.button("← Back to Terms"):
                st.session_state["wizard_step"] = 3
                st.rerun()
        with b2:
            if st.button("Review Document Summary →", type="primary"):
                st.session_state["wizard_step"] = 5
                st.rerun()

    # STEP 5: REVIEW SUMMARY
    elif step == 5:
        st.markdown("<h2 style='font-size: 20px; font-weight: 700; margin-bottom: 6px;'>Step 5: Review Before AI Generation</h2>", unsafe_allow_html=True)
        st.markdown("<p style='color: #64748b; font-size: 14px;'>Verify all document specifications before invoking the LegalEase AI synthesis model.</p>", unsafe_allow_html=True)

        st.markdown(f"""
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 600; color: #b45309; text-transform: uppercase; margin-bottom: 4px;">Document Specification</div>
            <h3 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">{w_data['document_type']}</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 14px;">
                <div><strong>Effective Date:</strong> {w_data['effective_date']}</div>
                <div><strong>Governing Jurisdiction:</strong> {w_data['jurisdiction']}</div>
                <div><strong>Language:</strong> {w_data['document_language']}</div>
                <div><strong>Tone:</strong> {w_data['tone']}</div>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
            <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">PARTIES ({len(w_data['parties'])}):</div>
            <ul style="font-size: 13.5px; color: #334155; margin: 0 0 16px 20px;">
                {"".join([f"<li><strong>{p.get('name')}</strong> ({p.get('role', 'Party')}) — {p.get('company', 'Individual')}</li>" for p in w_data['parties']])}
            </ul>

            <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">TERMS SPECIFIED ({len(w_data['terms'])}):</div>
            <ol style="font-size: 13.5px; color: #334155; margin: 0 0 0 20px;">
                {"".join([f"<li>{t}</li>" for t in w_data['terms'] if t.strip()])}
            </ol>
        </div>
        """, unsafe_allow_html=True)

        st.caption("LegalEase AI generates documents for informational and drafting purposes. Review by qualified legal counsel is advised.")

        b1, b2 = st.columns([1, 2])
        with b1:
            if st.button("← Edit Inputs"):
                st.session_state["wizard_step"] = 4
                st.rerun()
        with b2:
            if st.button("⚡ Generate Legal Document", type="primary", use_container_width=True):
                with st.spinner("Generating your legal document with LegalEase AI..."):
                    req = DocumentRequest(
                        document_type=w_data["document_type"],
                        parties=[Party(**p) for p in w_data["parties"] if p.get("name")],
                        terms=[t for t in w_data["terms"] if t.strip()],
                        effective_date=w_data["effective_date"],
                        jurisdiction=w_data["jurisdiction"],
                        additional_instructions=w_data.get("additional_instructions", ""),
                        document_language=w_data.get("document_language", "English"),
                        tone=w_data.get("tone", "Formal & Binding")
                    )
                    generated_doc = generate_legal_document(req)
                    saved_doc = save_document(generated_doc)
                    st.session_state["current_doc"] = saved_doc
                    st.session_state["wizard_step"] = 6
                    st.rerun()

    # STEP 6: DOCUMENT WORKSPACE & PREVIEW
    elif step == 6:
        doc = st.session_state.get("current_doc")
        if not doc:
            st.warning("No active document loaded.")
            if st.button("Start New Document"):
                st.session_state["wizard_step"] = 1
                st.rerun()
        else:
            # Header actions bar
            h_col1, h_col2 = st.columns([3, 2])
            with h_col1:
                st.markdown(f"""
                <div style="display: flex; align-items: baseline; gap: 12px;">
                    <h2 style="font-size: 22px; font-weight: 700; margin: 0; color: #0f172a;">{doc.title}</h2>
                    <span style="font-size: 12px; background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 4px; font-weight: 600;">v{doc.version}</span>
                </div>
                <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                    {doc.document_type} · Effective: {doc.effective_date} · {doc.jurisdiction}
                </div>
                """, unsafe_allow_html=True)
            with h_col2:
                btn_m1, btn_m2 = st.columns(2)
                with btn_m1:
                    edit_mode = st.toggle("Edit Document", value=False)
                with btn_m2:
                    if st.button("+ New Document"):
                        st.session_state["wizard_step"] = 1
                        st.rerun()

            # Main Two-Column Layout: Preview / Editor on Left, Downloads & Metadata on Right
            left_col, right_col = st.columns([7, 3])

            with left_col:
                if edit_mode:
                    st.markdown("<div style='background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 12px;'>⚠️ Editing Mode Active. Modify clauses and click 'Save Changes' to update version history.</div>", unsafe_allow_html=True)
                    
                    new_title = st.text_input("Document Title", value=doc.title)
                    new_date = st.text_input("Effective Date", value=doc.effective_date)
                    new_jur = st.text_input("Jurisdiction", value=doc.jurisdiction)

                    st.markdown("#### Document Sections")
                    edited_sections = []
                    for s_idx, sec in enumerate(doc.sections):
                        s_head = st.text_input(f"Section {s_idx + 1} Heading", value=sec.heading, key=f"edit_head_{s_idx}")
                        s_body = st.text_area(f"Section {s_idx + 1} Content", value=sec.content, height=140, key=f"edit_body_{s_idx}")
                        edited_sections.append(Section(heading=s_head, content=s_body))

                    if st.button("💾 Save Changes", type="primary"):
                        from backend.schemas.document import UpdateDocumentRequest
                        up_req = UpdateDocumentRequest(
                            title=new_title,
                            effective_date=new_date,
                            jurisdiction=new_jur,
                            sections=edited_sections
                        )
                        updated = update_document(doc.id, up_req)
                        if updated:
                            st.session_state["current_doc"] = updated
                            st.success(f"Document updated successfully to Version {updated.version}!")
                            st.rerun()

                else:
                    # Professional Document Paper View
                    paper_html = f"""
                    <div class="legal-paper">
                        <div class="legal-title">{doc.title}</div>
                        <div class="legal-meta">Effective Date: {doc.effective_date} &nbsp;|&nbsp; Governing Law: {doc.jurisdiction}</div>
                        
                        <div class="legal-parties-box">
                            <strong>PARTIES:</strong><br>
                            {"<br>".join([f"• <strong>{p.name}</strong> ({p.role or 'Signatory'})" + (f", on behalf of <em>{p.company}</em>" if p.company else "") + (f" — Address: {p.address}" if p.address else "") for p in doc.parties])}
                        </div>
                    """

                    # Terms summary if present
                    if doc.key_terms:
                        paper_html += """
                        <div style="margin: 20px 0;">
                            <strong style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Key Terms Summary:</strong>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px;">
                                <tr style="background: #0f172a; color: white;">
                                    <th style="padding: 8px 12px; text-align: left; width: 35%;">Provision</th>
                                    <th style="padding: 8px 12px; text-align: left;">Agreed Specification</th>
                                </tr>
                        """
                        for idx, kt in enumerate(doc.key_terms):
                            bg = "#f8fafc" if idx % 2 == 1 else "#ffffff"
                            paper_html += f"""
                                <tr style="background: {bg}; border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">{kt.term}</td>
                                    <td style="padding: 8px 12px; color: #334155;">{kt.details}</td>
                                </tr>
                            """
                        paper_html += "</table></div>"

                    # Sections
                    for sec in doc.sections:
                        paper_html += f'<div class="legal-heading">{sec.heading}</div>'
                        paras = sec.content.split("\n\n")
                        for p in paras:
                            if p.strip():
                                paper_html += f'<div class="legal-paragraph">{p.strip()}</div>'

                    # Signature blocks
                    paper_html += """
                    <div style="margin-top: 36px; padding-top: 20px; border-top: 2px solid #0f172a;">
                        <strong>IN WITNESS WHEREOF</strong>, the Parties hereto have caused this Agreement to be executed by their duly authorized representatives.
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 28px; font-family: 'Plus Jakarta Sans', sans-serif;">
                    """
                    for sb in doc.signature_blocks:
                        comp_line = f"<div>{sb.party_company}</div>" if sb.party_company else ""
                        paper_html += f"""
                        <div>
                            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">{sb.party_name.upper()}</div>
                            {comp_line}
                            <div style="font-size: 12px; color: #64748b;">{sb.party_role or 'Authorized Signatory'}</div>
                            <div style="margin-top: 32px; border-bottom: 1px solid #0f172a; width: 85%;"></div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Authorized Signature</div>
                            <div style="margin-top: 14px; font-size: 12px; color: #64748b;">Date: ________________________</div>
                        </div>
                        """
                    paper_html += f"""
                        </div>
                    </div>
                    <div class="legal-disclaimer">DISCLAIMER: {doc.disclaimer}</div>
                    </div>
                    """
                    st.markdown(paper_html, unsafe_allow_html=True)

            with right_col:
                st.markdown("""
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 14px 0; font-size: 15px; color: #0f172a;">Download Center</h4>
                    <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Export your generated legal instrument in enterprise-ready document formats.</p>
                </div>
                """, unsafe_allow_html=True)

                # Export DOCX
                docx_bytes, _, docx_name = export_document(doc, "docx")
                st.download_button(
                    label="📄 Download DOCX (Word)",
                    data=docx_bytes,
                    file_name=docx_name,
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    use_container_width=True
                )

                st.markdown("<div style='height: 8px;'></div>", unsafe_allow_html=True)

                # Export PDF
                pdf_bytes, _, pdf_name = export_document(doc, "pdf")
                st.download_button(
                    label="📕 Download PDF (Branded)",
                    data=pdf_bytes,
                    file_name=pdf_name,
                    mime="application/pdf",
                    use_container_width=True
                )

                st.markdown("<div style='height: 8px;'></div>", unsafe_allow_html=True)

                # Export TXT
                txt_bytes, _, txt_name = export_document(doc, "txt")
                st.download_button(
                    label="📝 Download TXT (Plain Text)",
                    data=txt_bytes,
                    file_name=txt_name,
                    mime="text/plain",
                    use_container_width=True
                )

                # Metadata Card
                st.markdown(f"""
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 20px; font-size: 12px; color: #475569;">
                    <strong>Document ID:</strong><br><code>{doc.id}</code><br><br>
                    <strong>Version:</strong> {doc.version}<br>
                    <strong>Created:</strong> {doc.created_at[:19]}<br>
                    <strong>Last Modified:</strong> {doc.updated_at[:19]}<br>
                    <strong>Clauses:</strong> {len(doc.sections)} sections<br>
                    <strong>Status:</strong> Ready for execution
                </div>
                """, unsafe_allow_html=True)


# ==========================================
# 3. MY DOCUMENTS
# ==========================================
elif nav == "My Documents":
    st.markdown("<h2 style='font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px;'>Document Library</h2>", unsafe_allow_html=True)
    st.markdown("<p style='color: #64748b; font-size: 14px; margin-bottom: 24px;'>Manage, review, version, and export your generated legal instruments.</p>", unsafe_allow_html=True)

    docs = list_documents()
    if not docs:
        st.info("No documents in repository yet. Create your first document.")
    else:
        for d in docs:
            with st.container():
                c1, c2, c3, c4 = st.columns([3, 3, 2, 2])
                with c1:
                    st.markdown(f"**{d.title}**<br><span style='font-size: 12px; color: #64748b;'>{d.document_type} (v{d.version})</span>", unsafe_allow_html=True)
                with c2:
                    st.markdown(f"<span style='font-size: 13px; color: #334155;'>Parties: {d.parties_summary}</span>", unsafe_allow_html=True)
                with c3:
                    st.markdown(f"<span style='font-size: 12px; color: #64748b;'>Updated: {d.updated_at[:10]}</span>", unsafe_allow_html=True)
                with c4:
                    col_b1, col_b2 = st.columns(2)
                    with col_b1:
                        if st.button("Open", key=f"lib_open_{d.id}"):
                            from backend.services.document_service import get_document
                            full_doc = get_document(d.id)
                            if full_doc:
                                st.session_state["current_doc"] = full_doc
                                st.session_state["wizard_step"] = 6
                                st.session_state["nav"] = "Create Document"
                                st.rerun()
                    with col_b2:
                        if st.button("Delete", key=f"lib_del_{d.id}"):
                            delete_document(d.id)
                            st.rerun()
                st.markdown("<hr style='margin: 8px 0; border: none; border-top: 1px solid #f1f5f9;'>", unsafe_allow_html=True)


# ==========================================
# 4. TEMPLATES
# ==========================================
elif nav == "Templates":
    st.markdown("<h2 style='font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px;'>Legal Instrument Templates</h2>", unsafe_allow_html=True)
    st.markdown("<p style='color: #64748b; font-size: 14px; margin-bottom: 24px;'>Start from curated, enterprise-standard legal agreements.</p>", unsafe_allow_html=True)

    templates = get_templates()
    cols = st.columns(2)
    for i, t in enumerate(templates):
        with cols[i % 2]:
            st.markdown(f"""
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 16px;">
                <div style="font-size: 11px; font-weight: 600; color: #b45309; text-transform: uppercase;">{t.category}</div>
                <h3 style="font-size: 17px; font-weight: 700; color: #0f172a; margin: 4px 0 8px 0;">{t.title}</h3>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 12px; line-height: 1.5;">{t.description}</p>
                <div style="font-size: 12px; color: #334155; margin-bottom: 14px;"><strong>Pre-configured Terms:</strong> {len(t.default_terms)} clauses</div>
            </div>
            """, unsafe_allow_html=True)
            if st.button(f"Use This Template", key=f"use_tmpl_{t.id}"):
                st.session_state["wizard_data"] = {
                    "document_type": t.title,
                    "parties": t.default_parties,
                    "terms": t.default_terms,
                    "effective_date": datetime.date.today().strftime("%B %d, %Y"),
                    "jurisdiction": t.suggested_jurisdiction,
                    "additional_instructions": "",
                    "document_language": "English",
                    "tone": "Formal & Binding"
                }
                st.session_state["wizard_step"] = 2
                st.session_state["nav"] = "Create Document"
                st.rerun()


# ==========================================
# 5. SETTINGS
# ==========================================
elif nav == "Settings":
    st.markdown("<h2 style='font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px;'>Settings & System Preferences</h2>", unsafe_allow_html=True)
    st.markdown("<p style='color: #64748b; font-size: 14px; margin-bottom: 24px;'>Configure LegalEase AI workspace defaults and AI parameters.</p>", unsafe_allow_html=True)

    tab1, tab2, tab3 = st.tabs(["AI Configuration", "Document Defaults", "Privacy & Security"])
    with tab1:
        st.markdown("#### Google Gemini AI Integration")
        from backend.config import GEMINI_MODEL, GEMINI_API_KEY
        st.text_input("Active AI Model", value=GEMINI_MODEL, disabled=True)
        key_status = "Active & Configured (Securely managed via environment)" if GEMINI_API_KEY else "Fallback Mode Enabled"
        st.text_input("API Key Status", value=key_status, disabled=True)
        st.caption("AI Studio runtime injects credentials securely via environment variables.")

    with tab2:
        st.markdown("#### Global Defaults")
        st.selectbox("Default Jurisdiction", ["State of Delaware", "State of California", "State of New York"])
        st.selectbox("Default Currency", ["USD ($)", "EUR (€)", "GBP (£)"])
        st.checkbox("Include Terms Summary Table in DOCX by default", value=True)
        st.checkbox("Enable Page Numbering in PDF header", value=True)

    with tab3:
        st.markdown("#### Privacy & Data Retention")
        st.markdown("""
        - **No Permanent PII Logging:** Confidential contract terms and party contact details are never logged to public telemetry.
        - **Ephemeral In-Memory Processing:** Documents are stored in secure local memory sessions during active drafting.
        - **Client-Side Export:** Direct binary downloads without third-party transit.
        """)


# ==========================================
# 6. HELP & DISCLAIMER
# ==========================================
elif nav == "Help & Disclaimer":
    st.markdown("<h2 style='font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px;'>About LegalEase AI & Legal Disclaimer</h2>", unsafe_allow_html=True)
    
    st.markdown("""
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0;">
        <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Legal Notice & Regulatory Disclaimer</h3>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            <strong>LegalEase AI</strong> is an enterprise software platform designed to assist professionals with document generation, structural structuring, and legal formatting.
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            LegalEase AI does NOT provide legal advice, legal representation, or lawyer referral services. Use of LegalEase AI does not create an attorney-client relationship. Generated agreements and contracts are provided for informational and drafting purposes only.
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Contractual enforceability and regulatory compliance vary by jurisdiction. You are advised to have any generated document reviewed by a licensed attorney qualified in your governing jurisdiction prior to execution.
        </p>
    </div>
    """, unsafe_allow_html=True)
