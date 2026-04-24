from fastapi import APIRouter, UploadFile, File, HTTPException
from config.settings import MAX_UPLOAD_SIZE_MB
from services.document_analyzer import extract_text_from_file
from utils.session_store import session

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}

@router.post("/upload-docs")
async def upload_docs(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX, or TXT.")

    content = await file.read()
    max_size_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE_MB} MB.",
        )

    text = extract_text_from_file(content, file.content_type, file.filename)

    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from the document.")

    session["document_text"] = text
    session["topics"] = []
    session["script"] = ""

    return {"message": "Document uploaded and processed.", "char_count": len(text)}


@router.post("/reset")
def reset():
    session.clear()
    return {"message": "Session reset."}
