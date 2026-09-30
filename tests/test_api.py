import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "LegalEase AI" in data["service"]

def test_templates_endpoint():
    response = client.get("/templates")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5
    first = data[0]
    assert "title" in first
    assert "default_terms" in first

def test_validation_empty_parties():
    payload = {
        "document_type": "Freelance Work Contract",
        "parties": [],
        "terms": ["Payment in 30 days"],
        "effective_date": "2025-04-15"
    }
    response = client.post("/generate", json=payload)
    assert response.status_code == 422 # Unprocessable Entity from Pydantic

def test_validation_empty_party_name():
    payload = {
        "document_type": "Freelance Work Contract",
        "parties": [{"name": "   ", "role": "Client"}],
        "terms": ["Payment in 30 days"],
        "effective_date": "2025-04-15"
    }
    response = client.post("/generate", json=payload)
    assert response.status_code == 422

def test_generate_freelance_contract():
    payload = {
        "document_type": "Freelance Work Contract",
        "parties": [
            {"name": "Jane Doe", "company": "Studio Creatives", "role": "Contractor"},
            {"name": "TechNova Inc.", "company": "TechNova Corp", "role": "Client"}
        ],
        "terms": [
            "Payment within 30 days;",
            "Confidentiality must be maintained;",
            "Either party may terminate with 15 days notice."
        ],
        "effective_date": "April 15, 2025",
        "jurisdiction": "State of California"
    }
    response = client.post("/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    doc = data["document"]
    assert doc["document_type"] == "Freelance Work Contract"
    assert len(doc["parties"]) == 2
    assert len(doc["sections"]) >= 4
    assert len(doc["key_terms"]) >= 3
    assert len(doc["signature_blocks"]) == 2
    assert doc["version"] == 1

def test_document_export_and_versioning():
    # 1. Generate a document
    payload = {
        "document_type": "Non-Disclosure Agreement (NDA)",
        "parties": [
            {"name": "Disclosing Inc.", "role": "Disclosing Party"},
            {"name": "Receiving Corp.", "role": "Receiving Party"}
        ],
        "terms": ["Trade secrets confidential for 5 years."],
        "effective_date": "May 1, 2025"
    }
    gen_res = client.post("/generate", json=payload)
    doc_id = gen_res.json()["document"]["id"]

    # 2. Export to TXT
    txt_res = client.post(f"/api/documents/{doc_id}/export/txt")
    assert txt_res.status_code == 200
    assert "Disclosing Inc." in txt_res.text

    # 3. Export to DOCX
    docx_res = client.post(f"/api/documents/{doc_id}/export/docx")
    assert docx_res.status_code == 200
    assert docx_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert len(docx_res.content) > 1000

    # 4. Export to PDF
    pdf_res = client.post(f"/api/documents/{doc_id}/export/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")

    # 5. Update document to test versioning
    update_res = client.put(f"/api/documents/{doc_id}", json={
        "title": "UPDATED MUTUAL NDA"
    })
    assert update_res.status_code == 200
    assert update_res.json()["document"]["version"] == 2
    assert update_res.json()["document"]["title"] == "UPDATED MUTUAL NDA"
