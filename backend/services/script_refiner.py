# Agent Step 6: Script Refiner
# Regenerates the full script based on user modification instructions

from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from config.settings import GROQ_API_KEY

REFINE_TEMPLATE = """
You are a podcast script editor.

Here is the original podcast script:
{original_script}

The user wants the following changes:
{instruction}

Original podcast details:
- Host: {host_name} ({host_gender})
- Guest: {guest_name} ({guest_gender})
- Topics: {topics}

Rewrite the FULL script incorporating the requested changes. Keep the same format:
[SPEAKER NAME]: dialogue

Write the complete revised script now:
"""

def refine_script(original_script: str, instruction: str, context: dict) -> str:
    prompt = PromptTemplate(
        input_variables=["original_script", "instruction", "host_name",
                         "host_gender", "guest_name", "guest_gender", "topics"],
        template=REFINE_TEMPLATE,
    )

    llm = ChatGroq(api_key=GROQ_API_KEY, model_name="llama3-8b-8192", temperature=0.7)
    chain = LLMChain(llm=llm, prompt=prompt)

    result = chain.run(
        original_script=original_script,
        instruction=instruction,
        host_name=context.get("host_name", "Host"),
        host_gender=context.get("host_gender", ""),
        guest_name=context.get("guest_name", "Guest"),
        guest_gender=context.get("guest_gender", ""),
        topics=", ".join(context.get("topics", [])),
    )

    return result.strip()
