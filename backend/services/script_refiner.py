# Agent Step 6: Script Refiner
# Regenerates the full script based on user modification instructions

from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

from config.settings import GROQ_API_KEY, GROQ_MODEL
from prompts import SCRIPT_REFINEMENT_TEMPLATE

def refine_script(original_script: str, instruction: str, context: dict) -> str:
    prompt = PromptTemplate.from_template(SCRIPT_REFINEMENT_TEMPLATE)

    llm = ChatGroq(api_key=GROQ_API_KEY, model_name=GROQ_MODEL, temperature=0.7)
    chain = prompt | llm

    result = chain.invoke(
        {
            "original_script": original_script,
            "instruction": instruction,
            "host_name": context.get("host_name", "Host"),
            "host_gender": context.get("host_gender", ""),
            "guest_name": context.get("guest_name", "Guest"),
            "guest_gender": context.get("guest_gender", ""),
            "topics": ", ".join(context.get("topics", [])),
        }
    )

    return result.content.strip()
