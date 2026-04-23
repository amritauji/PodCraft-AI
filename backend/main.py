from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from config.settings import ALLOWED_ORIGINS
from routes import upload, topics, script

app = FastAPI(title="PodCraft AI", version="1.0.0")

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

@app.get("/")
def root():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        html = index_file.read_text(encoding="utf-8")
        if "/assets/script.js" not in html:
            html = html.replace("</body>", '<script src="/assets/script.js" defer></script>\n</body>', 1)
        return HTMLResponse(html)
    return {"status": "PodCraft AI is running"}
