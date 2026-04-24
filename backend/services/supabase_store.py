# Supabase storage service
# Saves generated scripts and user inputs with timestamps

import logging
from datetime import datetime, timezone

from supabase import create_client
from config.settings import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

def save_to_supabase(user_inputs: dict, script: str):
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.info("Supabase is not configured. Skipping persistence.")
        return

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
        logger.warning("Supabase persistence failed: %s", e)
