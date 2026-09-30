from fastapi import APIRouter, HTTPException, Response, status
from typing import List, Optional
from backend.schemas.document import (
    DocumentRequest,
    StructuredDocument,
    DocumentListItem,
    UpdateDocumentRequest
)
from ai_core.gemini_generator import generate_legal_document
from backend.services.document_service import (
    save_document,
    get_document,
    list_documents,
    update_document,
    delete_document,
    get_document_versions
)
from backend.services.export_service import export_document

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("/generate", response_model=dict)
def generate_document_endpoint(request: DocumentRequest):
    """
    Validates request and generates a complete, structured legal document.
    Saves automatically to repository and returns structured document.
    """
    try:
        doc = generate_legal_document(request)
        saved = save_document(doc)
        return {
            "success": True,
            "document": saved.model_dump()
        }
    except Exception as e:
        return {
            "success": False,
            "error": {
                "code": "GENERATION_ERROR",
                "message": f"Failed to generate legal document: {str(e)}"
            }
        }

@router.get("", response_model=List[DocumentListItem])
def get_documents_endpoint():
    return list_documents()

@router.get("/{doc_id}")
def get_single_document(doc_id: str):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    versions = get_document_versions(doc_id)
    return {
        "success": True,
        "document": doc.model_dump(),
        "total_versions": len(versions)
    }

@router.put("/{doc_id}")
def update_single_document(doc_id: str, update_req: UpdateDocumentRequest):
    doc = update_document(doc_id, update_req)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found to update")
    return {
        "success": True,
        "document": doc.model_dump()
    }

@router.delete("/{doc_id}")
def delete_single_document(doc_id: str):
    success = delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found to delete")
    return {"success": True, "message": "Document deleted successfully"}

@router.get("/{doc_id}/versions")
def get_versions(doc_id: str):
    versions = get_document_versions(doc_id)
    return {"success": True, "versions": [v.model_dump() for v in versions]}

@router.post("/{doc_id}/export/{format_type}")
def export_stored_document(doc_id: str, format_type: str):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        content_bytes, media_type, filename = export_document(doc, format_type)
        return Response(
            content=content_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/export-direct/{format_type}")
def export_direct_endpoint(format_type: str, doc: StructuredDocument):
    """
    Directly exports an in-memory or edited document without requiring prior saving.
    """
    try:
        content_bytes, media_type, filename = export_document(doc, format_type)
        return Response(
            content=content_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Direct export failed: {str(e)}")
