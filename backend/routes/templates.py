from fastapi import APIRouter
from typing import List
from backend.schemas.document import TemplateDefinition
from backend.services.document_service import get_templates

router = APIRouter(prefix="/api/templates", tags=["Templates"])

@router.get("", response_model=List[TemplateDefinition])
def list_templates():
    return get_templates()
