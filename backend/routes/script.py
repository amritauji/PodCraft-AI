from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Literal
from services.script_generator import generate_podcast_script
from services.script_refiner import refine_script
from services.supabase_store import save_to_supabase
from utils.session_store import session

router = APIRouter()

class ScriptRequest(BaseModel):
    host_name: str
    host_gender: Literal["male", "female"]
    guest_name: str
    guest_gender: Literal["male", "female"]
    host_speed: int = Field(..., ge=50, le=150)
    guest_speed: int = Field(..., ge=50, le=150)
    duration: int = Field(..., ge=2, le=5)
    topics: List[str]

class ModifyRequest(BaseModel):
    instruction: str

@router.post("/generate-script")
def generate_script(req: ScriptRequest):
    if not session.get("document_text"):
        raise HTTPException(status_code=400, detail="No document uploaded.")
    if not req.topics:
        raise HTTPException(status_code=400, detail="At least one topic is required.")

    script = generate_podcast_script(
        document_text=session["document_text"],
        host_name=req.host_name,
        host_gender=req.host_gender,
        guest_name=req.guest_name,
        guest_gender=req.guest_gender,
        host_speed=req.host_speed,
        guest_speed=req.guest_speed,
        duration=req.duration,
        topics=req.topics,
    )

    session["script"] = script
    session["last_request"] = req.dict()

    save_to_supabase(req.dict(), script)

    return {"script": script}


@router.post("/modify-script")
def modify_script(req: ModifyRequest):
    if not session.get("script"):
        raise HTTPException(status_code=400, detail="No script to modify. Generate one first.")

    refined = refine_script(
        original_script=session["script"],
        instruction=req.instruction,
        context=session.get("last_request", {}),
    )

    session["script"] = refined
    return {"script": refined}
