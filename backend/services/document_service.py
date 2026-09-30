import uuid
from datetime import datetime
from typing import Dict, List, Optional
from backend.schemas.document import (
    StructuredDocument,
    DocumentListItem,
    UpdateDocumentRequest,
    TemplateDefinition
)

# In-memory document repository with version history
_DOCUMENT_STORE: Dict[str, StructuredDocument] = {}
_DOCUMENT_VERSIONS: Dict[str, List[StructuredDocument]] = {}

# Built-in enterprise legal templates
DEFAULT_TEMPLATES: List[TemplateDefinition] = [
    TemplateDefinition(
        id="freelance-contract",
        title="Freelance Work Contract",
        category="Contract",
        description="Comprehensive independent contractor agreement covering project scope, deliverables, milestones, fee structure, IP assignment, and termination notice.",
        default_terms=[
            "Payment within 30 days of monthly invoice submission.",
            "Client retains all intellectual property and proprietary rights upon receipt of full payment.",
            "Independent contractor status; no employee benefits or withholding.",
            "Confidentiality obligations survive agreement termination for 3 years.",
            "Either party may terminate without cause with fifteen (15) days written notice."
        ],
        default_parties=[
            {"name": "Jane Doe", "company": "Studio Creatives LLC", "role": "Contractor", "address": "1200 Market St, San Francisco, CA"},
            {"name": "TechNova Inc.", "company": "TechNova Corporation", "role": "Client", "address": "500 Innovation Way, Austin, TX"}
        ],
        suggested_jurisdiction="State of California"
    ),
    TemplateDefinition(
        id="nda",
        title="Non-Disclosure Agreement (NDA)",
        category="Agreement",
        description="Mutual or unilateral confidentiality agreement safeguarding proprietary business secrets, trade secrets, software algorithms, customer lists, and financial statements.",
        default_terms=[
            "Strict non-disclosure of confidential business and technical information.",
            "Exclusions include publicly known information or legally compelled disclosures.",
            "Return or certified destruction of materials upon written demand.",
            "Obligations remain in full force and effect for five (5) years from disclosure.",
            "Right to injunctive relief without requirement to post bond in case of breach."
        ],
        default_parties=[
            {"name": "Disclosing Entity", "company": "Apex Global Solutions", "role": "Disclosing Party", "address": "100 Wall Street, New York, NY"},
            {"name": "Receiving Entity", "company": "Vanguard Enterprises", "role": "Receiving Party", "address": "250 Michigan Ave, Chicago, IL"}
        ],
        suggested_jurisdiction="State of New York"
    ),
    TemplateDefinition(
        id="employment-contract",
        title="Employment Contract",
        category="Employment",
        description="Standard full-time employment agreement establishing duties, base compensation, annual bonus eligibility, paid time off, IP assignment, and termination conditions.",
        default_terms=[
            "Annual base salary of $135,000 paid bi-weekly.",
            "Standard benefits package including 401(k) matching and health coverage.",
            "Work-for-hire assignment of all intellectual property created during employment.",
            "Non-solicitation of clients and staff for twelve (12) months post-termination.",
            "Employment is at-will; 30-day notice requested for executive transitions."
        ],
        default_parties=[
            {"name": "Acme Software Corp", "company": "Acme Technologies Inc.", "role": "Employer", "address": "400 Tech Center Dr, Seattle, WA"},
            {"name": "Alex Morgan", "company": "", "role": "Employee", "address": "742 Evergreen Terrace, Seattle, WA"}
        ],
        suggested_jurisdiction="State of Washington"
    ),
    TemplateDefinition(
        id="lease-agreement",
        title="Commercial & Residential Lease Agreement",
        category="Real Estate",
        description="Comprehensive real estate lease covering demised premises, monthly rental payments, security deposit, maintenance responsibilities, utilities, and occupancy terms.",
        default_terms=[
            "Monthly rent of $3,200 due on the first calendar day of each month.",
            "Security deposit equal to two (2) months rent held in escrow account.",
            "Tenant responsible for utilities, internet, and interior maintenance.",
            "No subleasing or assignment without prior express written approval.",
            "Late fee of 5% assessed on payments received past 5 days grace period."
        ],
        default_parties=[
            {"name": "Marcus Sterling", "company": "Sterling Real Estate Holdings", "role": "Landlord", "address": "88 Commonwealth Ave, Boston, MA"},
            {"name": "Elena Rostova", "company": "Rostova Consulting LLC", "role": "Tenant", "address": "12 Beacon St, Boston, MA"}
        ],
        suggested_jurisdiction="Commonwealth of Massachusetts"
    ),
    TemplateDefinition(
        id="offer-letter",
        title="Employment Offer Letter",
        category="Employment",
        description="Formal offer of employment summarizing job title, start date, compensation structure, equity participation, reporting line, and contingent screening requirements.",
        default_terms=[
            "Base salary of $115,000 per annum with target 15% performance bonus.",
            "Eligibility for 10,000 stock options subject to four-year vesting schedule.",
            "Start date within thirty (30) days of signed acceptance.",
            "Contingent upon successful background screening and I-9 verification."
        ],
        default_parties=[
            {"name": "Apex Global Labs", "company": "Apex Global Inc.", "role": "Employer", "address": "800 Bellevue Way, Bellevue, WA"},
            {"name": "Jordan Smith", "company": "", "role": "Candidate", "address": "100 Pine St, Seattle, WA"}
        ],
        suggested_jurisdiction="State of Washington"
    ),
    TemplateDefinition(
        id="service-agreement",
        title="Master Services Agreement (MSA)",
        category="Contract",
        description="Commercial services agreement with statements of work (SOW), warranties, service level agreements (SLA), limitation of liability, and indemnity provisions.",
        default_terms=[
            "Services performed in accordance with mutually executed Statements of Work (SOW).",
            "Payment due net 30 days from invoice date.",
            "Mutual indemnification for gross negligence and willful misconduct.",
            "Aggregate liability capped at total fees paid in preceding 12 months.",
            "Term of one year with automatic annual renewal unless cancelled 60 days prior."
        ],
        default_parties=[
            {"name": "CloudScale Systems", "company": "CloudScale LLC", "role": "Service Provider", "address": "300 Riverfront Plaza, Denver, CO"},
            {"name": "OmniRetail Global", "company": "OmniRetail Corp", "role": "Client", "address": "550 5th Ave, New York, NY"}
        ],
        suggested_jurisdiction="State of Delaware"
    ),
    TemplateDefinition(
        id="general-agreement",
        title="General Business Agreement",
        category="General",
        description="Adaptable bilateral legal agreement suitable for strategic partnerships, asset purchases, collaborations, and formal commercial relationships.",
        default_terms=[
            "Mutual commitments and obligations executed in good faith.",
            "Each party bears its own transactional and legal expenses.",
            "Confidentiality and non-disclosure obligations apply to all shared information.",
            "Disputes resolved through binding arbitration under AAA rules."
        ],
        default_parties=[
            {"name": "First Party", "company": "First Venture Corp", "role": "Party A", "address": "100 Financial Way, Wilmington, DE"},
            {"name": "Second Party", "company": "Second Partner Group", "role": "Party B", "address": "200 Trade Center, Chicago, IL"}
        ],
        suggested_jurisdiction="State of Delaware"
    )
]

def seed_sample_documents_if_empty():
    """Seeds initial sample documents for enterprise demonstration."""
    if _DOCUMENT_STORE:
        return
    from ai_core.gemini_generator import _generate_fallback_document
    from backend.schemas.document import DocumentRequest, Party

    req = DocumentRequest(
        document_type="Freelance Work Contract",
        parties=[
            Party(name="Jane Doe", company="Studio Creatives", role="Contractor", address="San Francisco, CA", email="jane@studiocreatives.com"),
            Party(name="TechNova Inc.", company="TechNova Corp", role="Client", address="Austin, TX", email="contracts@technova.com")
        ],
        terms=[
            "Payment within 30 days of monthly invoice.",
            "Confidentiality must be maintained for 3 years post-completion.",
            "Either party may terminate with 15 days written notice.",
            "Contractor retains moral rights but assigns all work IP to Client upon full compensation."
        ],
        effective_date="April 15, 2025",
        jurisdiction="State of California"
    )
    sample_doc = _generate_fallback_document(req)
    sample_doc.id = "doc-demo-freelance-01"
    save_document(sample_doc)

def save_document(doc: StructuredDocument) -> StructuredDocument:
    _DOCUMENT_STORE[doc.id] = doc
    if doc.id not in _DOCUMENT_VERSIONS:
        _DOCUMENT_VERSIONS[doc.id] = []
    _DOCUMENT_VERSIONS[doc.id].append(doc.model_copy(deep=True))
    return doc

def get_document(doc_id: str) -> Optional[StructuredDocument]:
    return _DOCUMENT_STORE.get(doc_id)

def get_document_versions(doc_id: str) -> List[StructuredDocument]:
    return _DOCUMENT_VERSIONS.get(doc_id, [])

def list_documents() -> List[DocumentListItem]:
    seed_sample_documents_if_empty()
    items: List[DocumentListItem] = []
    # Sort newest first
    sorted_docs = sorted(_DOCUMENT_STORE.values(), key=lambda d: d.updated_at, reverse=True)
    for d in sorted_docs:
        parties_str = " & ".join([p.name for p in d.parties])
        items.append(DocumentListItem(
            id=d.id,
            title=d.title,
            document_type=d.document_type,
            effective_date=d.effective_date,
            parties_summary=parties_str,
            version=d.version,
            created_at=d.created_at,
            updated_at=d.updated_at,
            status="Completed"
        ))
    return items

def update_document(doc_id: str, update_req: UpdateDocumentRequest) -> Optional[StructuredDocument]:
    doc = _DOCUMENT_STORE.get(doc_id)
    if not doc:
        return None

    # Increment version
    new_version = doc.version + 1
    now_str = datetime.utcnow().isoformat()

    updated_doc = doc.model_copy(deep=True)
    updated_doc.version = new_version
    updated_doc.updated_at = now_str

    if update_req.title is not None:
        updated_doc.title = update_req.title
    if update_req.effective_date is not None:
        updated_doc.effective_date = update_req.effective_date
    if update_req.jurisdiction is not None:
        updated_doc.jurisdiction = update_req.jurisdiction
    if update_req.sections is not None:
        updated_doc.sections = update_req.sections
    if update_req.key_terms is not None:
        updated_doc.key_terms = update_req.key_terms
    if update_req.parties is not None:
        updated_doc.parties = update_req.parties

    return save_document(updated_doc)

def delete_document(doc_id: str) -> bool:
    if doc_id in _DOCUMENT_STORE:
        del _DOCUMENT_STORE[doc_id]
        if doc_id in _DOCUMENT_VERSIONS:
            del _DOCUMENT_VERSIONS[doc_id]
        return True
    return False

def get_templates() -> List[TemplateDefinition]:
    return DEFAULT_TEMPLATES
