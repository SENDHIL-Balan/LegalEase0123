import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import ALLOWED_ORIGINS, DISCLAIMER_TEXT
from backend.routes import health, documents, templates

app = FastAPI(
    title="LegalEase AI",
    description="Enterprise-grade AI legal document generation and management platform.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(templates.router)
app.include_router(documents.router)

# Also support POST /generate at root as requested in prompt:
# "Implement at minimum: GET /, GET /health, POST /generate, POST /documents, POST /documents/{id}/export, GET /templates"
@app.get("/")
def root():
    return {
        "brand": "LegalEase AI",
        "tagline": "Create, understand, and manage legal documents with AI.",
        "status": "operational",
        "endpoints": [
            "/health",
            "/api/templates",
            "/api/documents",
            "/api/documents/generate",
            "/api/documents/{id}/export/{format}"
        ],
        "disclaimer": DISCLAIMER_TEXT
    }

@app.post("/generate")
def generate_root_alias(req: documents.DocumentRequest):
    return documents.generate_document_endpoint(req)

@app.get("/templates")
def templates_root_alias():
    return templates.list_templates()

@app.post("/documents")
def documents_post_alias(req: documents.DocumentRequest):
    return documents.generate_document_endpoint(req)

@app.get("/documents")
def documents_get_alias():
    return documents.get_documents_endpoint()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
