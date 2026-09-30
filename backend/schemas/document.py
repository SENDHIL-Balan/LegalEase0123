from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime

class Party(BaseModel):
    name: str = Field(..., min_length=1, description="Full legal name of the party or representative")
    company: Optional[str] = Field("", description="Company or organization name if applicable")
    role: Optional[str] = Field("Party", description="Role (e.g., Client, Contractor, Employer, Employee, Landlord, Tenant)")
    address: Optional[str] = Field("", description="Official address")
    email: Optional[str] = Field("", description="Contact email")
    phone: Optional[str] = Field("", description="Contact phone")

class DocumentRequest(BaseModel):
    document_type: str = Field(..., min_length=2, description="Type of document, e.g., Freelance Work Contract, NDA, Lease Agreement")
    parties: List[Party] = Field(..., min_length=1, description="List of parties involved")
    terms: List[str] = Field(default_factory=list, description="List of key terms or conditions")
    effective_date: str = Field(..., min_length=1, description="Effective date of the agreement")
    jurisdiction: Optional[str] = Field("General / Mutual Jurisdiction", description="Governing law and jurisdiction")
    additional_instructions: Optional[str] = Field("", max_length=2000, description="Optional special clauses or instructions")
    document_language: Optional[str] = Field("English", description="Target language of the document")
    tone: Optional[str] = Field("Formal & Binding", description="Tone of the document")
    level_of_detail: Optional[str] = Field("Standard", description="Standard, Comprehensive, or Concise")

    @field_validator("parties")
    def validate_parties(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one party must be specified.")
        for p in v:
            if not p.name.strip():
                raise ValueError("Party name cannot be empty.")
        return v

    @field_validator("document_type")
    def validate_doc_type(cls, v):
        if not v or not v.strip():
            raise ValueError("Document type must be specified.")
        return v.strip()

class Section(BaseModel):
    heading: str
    content: str

class SignatureBlock(BaseModel):
    party_name: str
    party_role: Optional[str] = ""
    party_company: Optional[str] = ""
    date_placeholder: Optional[str] = "Date: ____________________"
    signature_line: Optional[str] = "Signature: ____________________"

class KeyTerm(BaseModel):
    term: str
    details: str

class StructuredDocument(BaseModel):
    id: str
    title: str
    document_type: str
    effective_date: str
    jurisdiction: Optional[str] = "General / Mutual Jurisdiction"
    parties: List[Party]
    key_terms: List[KeyTerm] = []
    sections: List[Section]
    signature_blocks: List[SignatureBlock]
    disclaimer: str
    version: int = 1
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UpdateDocumentRequest(BaseModel):
    title: Optional[str] = None
    effective_date: Optional[str] = None
    jurisdiction: Optional[str] = None
    sections: Optional[List[Section]] = None
    key_terms: Optional[List[KeyTerm]] = None
    parties: Optional[List[Party]] = None

class DocumentListItem(BaseModel):
    id: str
    title: str
    document_type: str
    effective_date: str
    parties_summary: str
    version: int
    created_at: str
    updated_at: str
    status: str = "Completed"

class TemplateDefinition(BaseModel):
    id: str
    title: str
    category: str
    description: str
    default_terms: List[str]
    default_parties: List[Dict[str, str]]
    suggested_jurisdiction: str = "State of Delaware / Mutual Agreement"
