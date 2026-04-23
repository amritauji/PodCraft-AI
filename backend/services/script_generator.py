# Agent Step 4 + 5: Dynamic Prompt Builder + Script Generator
# Uses LangChain + Groq (LLaMA) to generate a full podcast script

from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from config.settings import GROQ_API_KEY
from typing import List

# Approximate words per minute based on speed slider (1–10 scale)
def _words_for_duration(duration_minutes: int, speed: int) -> int:
    wpm = 100 + (speed - 1) * 15  # range: 100–235 wpm
    return duration_minutes * wpm

SCRIPT_TEMPLATE = """
You are a professional podcast script writer.

Write a complete, natural-sounding podcast script with the following details:

Host: {host_name} ({host_gender})
Guest: {guest_name} ({guest_gender})
Topics to cover: {topics}
Target length: approximately {word_count} words total

Guidelines:
- Start with a warm opening by the host
- Include natural fillers like "um", "hmm", "you know", "right"
- Cover each topic with a smooth transition
- Host asks questions, guest provides insights
- End with a closing summary and sign-off
- Format each line as: [SPEAKER NAME]: dialogue

Context from uploaded document:
{document_excerpt}

Write the full script now:
"""

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

    prompt = PromptTemplate(
        input_variables=["host_name", "host_gender", "guest_name", "guest_gender",
                         "topics", "word_count", "document_excerpt"],
        template=SCRIPT_TEMPLATE,
    )

    llm = ChatGroq(api_key=GROQ_API_KEY, model_name="llama3-8b-8192", temperature=0.7)
    chain = LLMChain(llm=llm, prompt=prompt)

    result = chain.run(
        host_name=host_name,
        host_gender=host_gender,
        guest_name=guest_name,
        guest_gender=guest_gender,
        topics=", ".join(topics),
        word_count=word_count,
        document_excerpt=excerpt,
    )

    return result.strip()
