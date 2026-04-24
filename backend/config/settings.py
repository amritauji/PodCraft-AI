import os
from dotenv import load_dotenv

load_dotenv()


def _get_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _get_list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values or default


APP_NAME = os.getenv("APP_NAME", "PodCraft AI")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
DEBUG = _get_bool("DEBUG", APP_ENV != "production")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

HOST = os.getenv("HOST", "0.0.0.0")
PORT = _get_int("PORT", 8000)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

MAX_UPLOAD_SIZE_MB = _get_int("MAX_UPLOAD_SIZE_MB", 20)

ALLOWED_ORIGINS = _get_list(
    "ALLOWED_ORIGINS",
    [
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
)


def is_production() -> bool:
    return APP_ENV == "production"


def get_missing_required_settings() -> list[str]:
    missing: list[str] = []
    if not GROQ_API_KEY:
        missing.append("GROQ_API_KEY")
    return missing
