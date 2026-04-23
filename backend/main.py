from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import ALLOWED_ORIGINS
from routes import upload, topics, script

app = FastAPI(title="PodCraft AI", version="1.0.0")

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
def health_check():
    return {"status": "PodCraft AI is running"}
