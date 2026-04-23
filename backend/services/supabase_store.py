# Supabase storage service
# Saves generated scripts and user inputs with timestamps

from supabase import create_client
from config.settings import SUPABASE_URL, SUPABASE_KEY
from datetime import datetime, timezone

def save_to_supabase(user_inputs: dict, script: str):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return  # Skip silently if Supabase is not configured

    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        client.table("podcast_scripts").insert({
            "host_name": user_inputs.get("host_name"),
            "guest_name": user_inputs.get("guest_name"),
            "topics": user_inputs.get("topics"),
            "duration": user_inputs.get("duration"),
            "script": script,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        print(f"[Supabase] Failed to save: {e}")
