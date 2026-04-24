from pathlib import Path
import logging

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from config.settings import (
    ALLOWED_ORIGINS,
    APP_NAME,
    APP_VERSION,
    DEBUG,
    LOG_LEVEL,
    get_missing_required_settings,
    is_production,
)
from routes import upload, topics, script

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title=APP_NAME, version=APP_VERSION, debug=DEBUG)

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR)), name="assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(topics.router)
app.include_router(script.router)


@app.on_event("startup")
def on_startup() -> None:
    missing = get_missing_required_settings()
    if missing:
        message = f"Missing required environment variables: {', '.join(missing)}"
        if is_production():
            logger.error(message)
        else:
            logger.warning("%s. App is running in limited mode.", message)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error at %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    missing = get_missing_required_settings()
    if missing:
        return {
            "status": "degraded",
            "missing": missing,
            "message": "Required integrations are not fully configured.",
        }
    return {"status": "ready"}

@app.get("/")
def root():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        html = index_file.read_text(encoding="utf-8")
        if "/assets/script.js" not in html:
            html = html.replace("</body>", '<script src="/assets/script.js" defer></script>\n</body>', 1)
        return HTMLResponse(html)
    return {"status": "PodCraft AI is running"}
