# Agent Step 4 + 5: Dynamic Prompt Builder + Script Generator
# Uses LangChain + Groq (LLaMA) to generate a full podcast script

from typing import List

from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

from config.settings import GROQ_API_KEY, GROQ_MODEL
from prompts import SCRIPT_GENERATION_TEMPLATE

# Approximate words per minute based on speed slider (50–150 scale)
def _words_for_duration(duration_minutes: int, speed: int) -> int:
    wpm = max(50, min(150, speed))
    return duration_minutes * wpm

def generate_podcast_script(
    document_text: str,
    host_name: str,
    host_gender: str,
    guest_name: str,
    guest_gender: str,
    host_speed: int,
    guest_speed: int,
    duration: int,
    topics: List[str],
) -> str:
    avg_speed = (host_speed + guest_speed) // 2
    word_count = _words_for_duration(duration, avg_speed)

    # Use first 3000 chars of document as context
    excerpt = document_text[:3000].strip()

    prompt = PromptTemplate.from_template(SCRIPT_GENERATION_TEMPLATE)

    llm = ChatGroq(api_key=GROQ_API_KEY, model_name=GROQ_MODEL, temperature=0.7)
    chain = prompt | llm

    result = chain.invoke(
        {
            "host_name": host_name,
            "host_gender": host_gender,
            "guest_name": guest_name,
            "guest_gender": guest_gender,
            "topics": ", ".join(topics),
            "word_count": word_count,
            "document_excerpt": excerpt,
        }
    )

    return result.content.strip()
