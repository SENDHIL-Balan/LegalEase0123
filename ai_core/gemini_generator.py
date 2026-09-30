import json
import uuid
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from backend.config import GEMINI_API_KEY, GEMINI_MODEL, DISCLAIMER_TEXT
from backend.schemas.document import (
    DocumentRequest,
    StructuredDocument,
    Section,
    SignatureBlock,
    KeyTerm,
    Party
)

def _generate_fallback_document(request: DocumentRequest) -> StructuredDocument:
    """
    Deterministic enterprise-grade fallback generator when Gemini API is
    unavailable, unconfigured, or returns an unparseable response.
    Preserves all user facts, parties, terms, date, and creates appropriate clauses.
    """
    doc_id = str(uuid.uuid4())
    doc_type = request.document_type
    effective_date = request.effective_date
    jurisdiction = request.jurisdiction or "Mutual Governing Jurisdiction"
    parties = request.parties

    party_names = [f"{p.name} ({p.role})" + (f", on behalf of {p.company}" if p.company else "") for p in parties]
    parties_str = " and ".join(party_names)

    # Title
    title = f"{doc_type.upper()}"

    # Build key terms table
    key_terms: List[KeyTerm] = []
    if request.terms:
        for idx, t in enumerate(request.terms):
            clean_term = t.strip()
            if not clean_term:
                continue
            if ":" in clean_term:
                parts = clean_term.split(":", 1)
                key_terms.append(KeyTerm(term=parts[0].strip(), details=parts[1].strip()))
            else:
                key_terms.append(KeyTerm(term=f"Term {idx + 1}", details=clean_term))
    else:
        key_terms.append(KeyTerm(term="Effective Term", details=f"Commences on {effective_date}"))
        key_terms.append(KeyTerm(term="Governing Law", details=jurisdiction))

    # Base sections depending on document type
    sections: List[Section] = []

    # 1. Preamble & Recitals
    sections.append(Section(
        heading="1. PREAMBLE & RECITALS",
        content=(
            f"This {doc_type} (this \"Agreement\") is entered into and made effective as of {effective_date} "
            f"(\"Effective Date\"), by and between the following parties: {parties_str}.\n\n"
            f"WHEREAS, the parties desire to establish a formal legal relationship regarding {doc_type.lower()}, "
            f"and agree to be mutually bound by the covenants, conditions, and terms set forth herein."
        )
    ))

    # 2. Scope & Responsibilities
    if "NDA" in doc_type or "Non-Disclosure" in doc_type:
        sections.append(Section(
            heading="2. CONFIDENTIAL INFORMATION DEFINITION",
            content=(
                "\"Confidential Information\" refers to any proprietary information, technical data, trade secrets, "
                "or know-how, including, but not limited to, research, product plans, products, services, customers, "
                "markets, software, developments, inventions, processes, designs, drawings, engineering, hardware "
                "configuration, marketing, or financial information disclosed by one party to the other, whether "
                "orally or in writing."
            )
        ))
        sections.append(Section(
            heading="3. OBLIGATIONS OF RECEIVING PARTY",
            content=(
                "The Receiving Party agrees to hold all Confidential Information in strict confidence and shall exercise "
                "a degree of care no less than reasonable care to prevent unauthorized disclosure, publication, or dissemination. "
                "Confidential Information shall not be disclosed to any third party without prior written consent."
            )
        ))
    elif "Employment" in doc_type or "Offer Letter" in doc_type:
        sections.append(Section(
            heading="2. POSITION, DUTIES & APPOINTMENT",
            content=(
                f"The Employer hereby engages the Employee to serve in the professional capacity designated in this Agreement. "
                f"The Employee agrees to faithfully, diligently, and to the best of their skill and ability perform all duties "
                f"assigned in accordance with professional industry standards and company policies."
            )
        ))
        sections.append(Section(
            heading="3. COMPENSATION & BENEFITS",
            content=(
                "Compensation shall be paid in accordance with the standard payroll schedule established by the Employer, "
                "subject to all applicable statutory withholdings and deductions. Specific compensation, bonuses, or benefits "
                "are stipulated in the Key Terms summary incorporated herein."
            )
        ))
    elif "Lease" in doc_type:
        sections.append(Section(
            heading="2. DEMISED PREMISES & OCCUPANCY",
            content=(
                "The Landlord hereby leases unto the Tenant, and the Tenant hereby takes from the Landlord, the designated "
                "premises for lawful use subject to the terms and conditions herein stated. The Tenant agrees to maintain "
                "the premises in a clean, orderly, and sanitary condition."
            )
        ))
        sections.append(Section(
            heading="3. RENT PAYMENT & SECURITY DEPOSIT",
            content=(
                "The Tenant agrees to deliver payment on or before the due date specified in the Key Terms. Any late payment "
                "or dishonored transaction shall be subject to customary administration charges."
            )
        ))
    else:
        sections.append(Section(
            heading="2. SCOPE OF ENGAGEMENT & SERVICES",
            content=(
                f"The parties agree that services or obligations undertaken under this {doc_type} shall be performed "
                f"in a professional and workmanlike manner, conforming to highest commercial standards and within the "
                f"timeframes mutually agreed upon."
            )
        ))
        sections.append(Section(
            heading="3. FEES, PAYMENT TERMS & EXPENSES",
            content=(
                "All invoices, payments, or financial considerations shall be settled strictly within the timeline and terms "
                "defined in this Agreement. Reimbursable expenses, if any, must receive prior written authorization."
            )
        ))

    # 4. Specific User Agreed Terms
    if request.terms:
        term_paragraphs = []
        for i, term in enumerate(request.terms, 1):
            clean_t = term.strip()
            if clean_t:
                term_paragraphs.append(f"4.{i} {clean_t}")
        sections.append(Section(
            heading="4. SPECIFIC OPERATIONAL COVENANTS",
            content="\n\n".join(term_paragraphs)
        ))

    # 5. Term and Termination
    sections.append(Section(
        heading="5. TERM & TERMINATION",
        content=(
            f"This Agreement shall commence on {effective_date} and shall continue until completed or terminated by either "
            "party in accordance with the provisions herein. In the event of a material breach, the non-breaching party "
            "may terminate this Agreement upon written notice if the breach remains uncured for a period of fifteen (15) days."
        )
    ))

    # 6. Governing Law & Dispute Resolution
    sections.append(Section(
        heading="6. GOVERNING LAW & DISPUTE RESOLUTION",
        content=(
            f"This Agreement shall be construed, interpreted, and governed in accordance with the laws of {jurisdiction}. "
            "Any controversy, claim, or dispute arising out of or relating to this Agreement shall first be submitted to "
            "good-faith settlement negotiations between senior executives of the parties before seeking formal arbitration or legal remedy."
        )
    ))

    # 7. Miscellaneous & Entire Agreement
    instructions_text = f" Additional special stipulations: {request.additional_instructions}" if request.additional_instructions else ""
    sections.append(Section(
        heading="7. ENTIRE AGREEMENT & AMENDMENT",
        content=(
            "This Agreement constitutes the entire understanding between the parties concerning the subject matter hereof "
            "and supersedes all prior agreements, representations, and understandings, whether written or oral. "
            f"No amendment or modification of this Agreement shall be valid unless in writing and signed by both parties.{instructions_text}"
        )
    ))

    # Signature blocks
    sig_blocks = []
    for p in parties:
        sig_blocks.append(SignatureBlock(
            party_name=p.name,
            party_role=p.role or "Authorized Signatory",
            party_company=p.company or "",
            date_placeholder="Date: ____________________",
            signature_line="Signature: ____________________"
        ))

    now_str = datetime.utcnow().isoformat()
    return StructuredDocument(
        id=doc_id,
        title=title,
        document_type=doc_type,
        effective_date=effective_date,
        jurisdiction=jurisdiction,
        parties=parties,
        key_terms=key_terms,
        sections=sections,
        signature_blocks=sig_blocks,
        disclaimer=DISCLAIMER_TEXT,
        version=1,
        created_at=now_str,
        updated_at=now_str
    )

def generate_legal_document(request: DocumentRequest) -> StructuredDocument:
    """
    Generates a structured legal document using Google Gemini via @google/genai SDK,
    with schema validation and deterministic fallback safety.
    """
    # If no API key is provided, safely invoke deterministic generator
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("MY_GEMINI") or GEMINI_API_KEY == "your_key_here":
        return _generate_fallback_document(request)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)

        # Prepare parties representation
        parties_detail = []
        for p in request.parties:
            parties_detail.append(
                f"- Name: {p.name}, Role: {p.role or 'Signatory'}, Organization: {p.company or 'N/A'}, Address: {p.address or 'N/A'}"
            )
        parties_formatted = "\n".join(parties_detail)
        terms_formatted = "\n".join([f"- {t}" for t in request.terms]) if request.terms else "Standard statutory terms applicable to document type."

        system_instruction = (
            "You are an expert enterprise legal document architect and senior corporate counsel for LegalEase AI. "
            "Your task is to draft a rigorous, balanced, highly professional legal document based exclusively on "
            "the provided structured inputs. Adhere strictly to these principles:\n"
            "1. FACTUAL FIDELITY: Incorporate all provided parties, dates, terms, and jurisdiction without omitting or altering facts.\n"
            "2. PROHIBITION OF FABRICATION: Do not invent false statutes, fake court citations, or fabricated legal codes.\n"
            "3. STRUCTURAL RIGOR: Organize the agreement logically with professional headings, recitals, defined terms, "
            "operational covenants, payment/compensation clauses, warranties, termination procedures, dispute resolution, and signature blocks.\n"
            "4. KEY TERMS EXTRACTION: Extract a key terms summary for a tabular overview (Term name vs Details).\n"
            "5. OUTPUT FORMAT: Respond ONLY with a valid, clean JSON object matching the requested schema. No markdown backticks, no explanatory chatter."
        )

        prompt = f"""
Draft a complete, enterprise-grade {request.document_type} with the following verified parameters:

DOCUMENT TYPE: {request.document_type}
EFFECTIVE DATE: {request.effective_date}
JURISDICTION: {request.jurisdiction or 'General / Mutual Agreement'}
DOCUMENT LANGUAGE: {request.document_language or 'English'}
TONE: {request.tone or 'Formal & Binding'}
LEVEL OF DETAIL: {request.level_of_detail or 'Standard'}

PARTIES:
{parties_formatted}

AGREED KEY TERMS & CONDITIONS:
{terms_formatted}

ADDITIONAL INSTRUCTIONS:
{request.additional_instructions or 'None'}

Return ONLY a JSON object with this exact structure:
{{
  "title": "{request.document_type.upper()}",
  "document_type": "{request.document_type}",
  "effective_date": "{request.effective_date}",
  "jurisdiction": "{request.jurisdiction or 'General / Mutual Agreement'}",
  "key_terms": [
    {{"term": "Payment", "details": "..."}},
    {{"term": "Term & Duration", "details": "..."}},
    {{"term": "Confidentiality", "details": "..."}}
  ],
  "sections": [
    {{
      "heading": "1. RECITALS & PURPOSE",
      "content": "Full legal text of the clause..."
    }},
    {{
      "heading": "2. DEFINITIONS",
      "content": "..."
    }},
    {{
      "heading": "3. RIGHTS AND OBLIGATIONS",
      "content": "..."
    }},
    {{
      "heading": "4. REMUNERATION AND EXPENSES",
      "content": "..."
    }},
    {{
      "heading": "5. TERM AND TERMINATION",
      "content": "..."
    }},
    {{
      "heading": "6. GOVERNING LAW & JURISDICTION",
      "content": "..."
    }},
    {{
      "heading": "7. MISCELLANEOUS",
      "content": "..."
    }}
  ],
  "signature_blocks": [
    {{
      "party_name": "Name of Party",
      "party_role": "Role / Title",
      "party_company": "Company",
      "date_placeholder": "Date: ____________________",
      "signature_line": "Signature: ____________________"
    }}
  ]
}}
"""

        model_name = GEMINI_MODEL or "gemini-3.8-flash"
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                response_mime_type="application/json"
            )
        )

        response_text = response.text.strip() if response.text else ""
        if not response_text:
            return _generate_fallback_document(request)

        # Parse JSON safely
        # Strip potential markdown formatting if returned
        clean_json = response_text
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.startswith("```"):
            clean_json = clean_json[3:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()

        data = json.loads(clean_json)

        # Convert sections
        raw_sections = data.get("sections", [])
        sections = [Section(heading=s.get("heading", f"Section {i+1}"), content=s.get("content", "")) for i, s in enumerate(raw_sections)]
        if not sections:
            return _generate_fallback_document(request)

        # Convert key_terms
        raw_terms = data.get("key_terms", [])
        key_terms = [KeyTerm(term=kt.get("term", "Term"), details=kt.get("details", "")) for kt in raw_terms]

        # Convert signature blocks
        raw_sigs = data.get("signature_blocks", [])
        signature_blocks = []
        if raw_sigs:
            for s in raw_sigs:
                signature_blocks.append(SignatureBlock(
                    party_name=s.get("party_name", "Authorized Signatory"),
                    party_role=s.get("party_role", ""),
                    party_company=s.get("party_company", ""),
                    date_placeholder=s.get("date_placeholder", "Date: ____________________"),
                    signature_line=s.get("signature_line", "Signature: ____________________")
                ))
        else:
            for p in request.parties:
                signature_blocks.append(SignatureBlock(
                    party_name=p.name,
                    party_role=p.role or "Signatory",
                    party_company=p.company or "",
                    date_placeholder="Date: ____________________",
                    signature_line="Signature: ____________________"
                ))

        now_str = datetime.utcnow().isoformat()
        return StructuredDocument(
            id=str(uuid.uuid4()),
            title=data.get("title", request.document_type.upper()),
            document_type=request.document_type,
            effective_date=request.effective_date,
            jurisdiction=data.get("jurisdiction", request.jurisdiction or "Mutual Agreement"),
            parties=request.parties,
            key_terms=key_terms,
            sections=sections,
            signature_blocks=signature_blocks,
            disclaimer=DISCLAIMER_TEXT,
            version=1,
            created_at=now_str,
            updated_at=now_str
        )
    except Exception as e:
        # Fall back reliably without crashing the user session
        print(f"[LegalEase AI Warning] Gemini AI generation encountered exception ({str(e)}). Utilizing deterministic legal synthesis engine.")
        return _generate_fallback_document(request)
