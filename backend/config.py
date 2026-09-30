import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# Default to currently supported, recommended high-performance Gemini model
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

APP_URL = os.getenv("APP_URL", "http://localhost:3000")
BACKEND_PORT = int(os.getenv("FASTAPI_PORT", "8000"))

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8501",
    "http://127.0.0.1:8501",
]
if os.getenv("APP_URL"):
    ALLOWED_ORIGINS.append(os.getenv("APP_URL"))

ASSETS_DIR = BASE_DIR / "assets"
LOGO_PATH = ASSETS_DIR / "logo" / "legalease_logo.png"

DISCLAIMER_TEXT = (
    "LegalEase AI generates documents for informational and drafting purposes. "
    "Generated documents do not constitute formal legal counsel and may require "
    "review by a qualified legal professional before execution."
)
