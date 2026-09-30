# ⚖️ LegalEase AI

> **"Create, understand, and manage legal documents with AI."**

LegalEase AI is an enterprise-grade AI-powered legal document generation and management platform. It transforms structured user inputs into professional, legally formatted agreements, contracts, and instruments with full preview, in-place clause editing, version history, and branded export to **PDF**, **DOCX**, and **TXT**.

---

## 🌟 Key Features

- **Enterprise Document Generation**: Supports Freelance Contracts, Employment Agreements, Non-Disclosure Agreements (NDAs), Real Estate Leases, Employment Offer Letters, Master Services Agreements (MSAs), and General Business Agreements.
- **AI Core (Google Gemini)**: Built with `@google/genai` utilizing configurable models (`GEMINI_MODEL`, defaulting to `gemini-3.8-flash`) with structured output enforcement and robust deterministic fallback safety.
- **Structured Multi-Step Creation Wizard**:
  1. *Type Selection*: High-fidelity cards with descriptions and scope.
  2. *Structured Parties*: Explicit fields for Name, Role, Organization, Address, Email, and Phone.
  3. *Agreed Terms*: Structured individual term management plus bulk semicolon-separated term importer.
  4. *Effective Date & Governance*: Calendar picker, jurisdiction selector, tone, and language configuration.
  5. *Review Before Generation*: Executive verification card prior to AI invocation.
  6. *Document Workspace*: Visual legal paper rendering with in-place clause editing and versioning.
- **Enterprise Document Generators**:
  - **DOCX (`python-docx`)**: LegalEase AI logo, Times New Roman typography, Key Terms Summary table with styled navy headers, formatted numbered clauses, and dual-column signature blocks.
  - **PDF (`fpdf2`)**: Branded running header, LegalEase logo, dynamic Key Terms table, running page numbers (`Page X of Y`), and confidentiality footers.
  - **TXT**: Standardized, clean ASCII layout with formal dividers without markdown noise.
- **Document Versioning & Management**: In-place edits create version increments (v1, v2) with saved change history.
- **Production-Quality Architecture**: Python FastAPI backend + Python Streamlit frontend + Modern Web Workspace running on port 3000.

---

## 🏛️ System Architecture

```
                 USER
                   │
                   ▼
     STREAMLIT UI / WEB INTERFACE (Port 3000)
                   │
                   │ HTTP JSON / API
                   ▼
             FASTAPI BACKEND (Port 8000)
                   │
          ┌────────┴─────────┐
          │                  │
          ▼                  ▼
     AI SERVICE        DOCUMENT SERVICE
          │                  │
          ▼                  ├── DOCX Generator (python-docx)
       GEMINI                ├── PDF Generator (fpdf2)
     (3.8-Flash)             └── TXT Generator
          │
          ▼
     STRUCTURED
     DOCUMENT
          │
          ▼
       PREVIEW
          │
          ▼
      USER EDITS (v1 -> v2)
          │
          ▼
   EXPORT (PDF / DOCX / TXT)
```

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+
- Node.js 18+ (for web preview)

### 2. Environment Variables
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Configure your Gemini API key:
```env
GEMINI_API_KEY="gemini-api-key"
GEMINI_MODEL="gemini-3.8-flash"
```

### 3. Run FastAPI Backend
```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Run Streamlit Frontend
```bash
streamlit run frontend/app.py --server.port 8501
```

### 5. Run Python Test Suite
```bash
python3 -m pytest tests/
```

---

## ⚖️ Legal Disclaimer

LegalEase AI generates documents for informational and drafting purposes only. Generated documents do not constitute formal legal counsel and may require review by a qualified legal professional before execution.
