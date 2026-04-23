from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.topic_extractor import extract_topics
from services.topic_validator import validate_topics
from utils.session_store import session

router = APIRouter()

class TopicValidationRequest(BaseModel):
    user_topics: List[str]

@router.get("/extract-topics")
def get_topics():
    if not session.get("document_text"):
        raise HTTPException(status_code=400, detail="No document uploaded. Please upload a document first.")

    topics = extract_topics(session["document_text"])
    session["extracted_topics"] = topics
    return {"topics": topics}


@router.post("/validate-topics")
def validate(req: TopicValidationRequest):
    extracted = session.get("extracted_topics", [])
    result = validate_topics(req.user_topics, extracted)
    session["validated_topics"] = result
    return result
