import pytest
from backend.schemas.document import StructuredDocument, Section, Party, SignatureBlock, KeyTerm
from document_generators.docx_generator import generate_docx
from document_generators.pdf_generator import generate_pdf
from document_generators.txt_generator import generate_txt

@pytest.fixture
def sample_structured_document():
    return StructuredDocument(
        id="test-doc-123",
        title="FREELANCE WORK CONTRACT",
        document_type="Freelance Work Contract",
        effective_date="April 15, 2025",
        jurisdiction="State of California",
        parties=[
            Party(name="Jane Doe", company="Studio Creatives", role="Contractor", address="123 Art Way, SF, CA"),
            Party(name="TechNova Inc.", company="TechNova Corp", role="Client", address="456 Tech Blvd, Austin, TX")
        ],
        key_terms=[
            KeyTerm(term="Payment", details="Payment within 30 days of monthly invoice"),
            KeyTerm(term="Confidentiality", details="Strict 3-year non-disclosure covenant"),
            KeyTerm(term="Termination", details="15 days written notice required")
        ],
        sections=[
            Section(heading="1. RECITALS", content="This agreement is made between Contractor and Client."),
            Section(heading="2. SCOPE OF SERVICES", content="Contractor agrees to deliver software engineering design specifications."),
            Section(heading="3. COMPENSATION", content="Client shall pay Contractor according to submitted milestones.")
        ],
        signature_blocks=[
            SignatureBlock(party_name="Jane Doe", party_role="Contractor"),
            SignatureBlock(party_name="TechNova Inc.", party_role="Client Representative")
        ],
        disclaimer="LegalEase AI generates documents for informational and drafting purposes.",
        version=1,
        created_at="2025-04-15T10:00:00",
        updated_at="2025-04-15T10:00:00"
    )

def test_generate_txt(sample_structured_document):
    txt_output = generate_txt(sample_structured_document)
    assert "FREELANCE WORK CONTRACT" in txt_output
    assert "Jane Doe" in txt_output
    assert "TechNova Inc." in txt_output
    assert "Payment within 30 days" in txt_output
    assert "1. RECITALS" in txt_output
    assert "DISCLAIMER NOTICE" in txt_output

def test_generate_docx(sample_structured_document):
    docx_bytes = generate_docx(sample_structured_document)
    assert isinstance(docx_bytes, bytes)
    # DOCX files are zip archives starting with 'PK'
    assert docx_bytes.startswith(b"PK")
    assert len(docx_bytes) > 2000

def test_generate_pdf(sample_structured_document):
    pdf_bytes = generate_pdf(sample_structured_document)
    assert isinstance(pdf_bytes, bytes)
    # PDF files start with '%PDF'
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 1000
