from fastapi import APIRouter
from backend.config import GEMINI_MODEL, GEMINI_API_KEY

router = APIRouter(tags=["Health"])

@router.get("/health")
@router.get("/api/health")
def health_check():
    has_gemini = bool(GEMINI_API_KEY and not GEMINI_API_KEY.startswith("MY_GEMINI") and GEMINI_API_KEY != "your_key_here")
    return {
        "status": "healthy",
        "service": "LegalEase AI API",
        "version": "1.0.0",
        "gemini": {
            "configured": has_gemini,
            "model": GEMINI_MODEL
        }
    }
