"""
feedback.py — OpenAI prompt logic for generating structured feedback
"""
import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are an academic mentor evaluating a student group's application snippet for a faculty research project.
Your job is to provide honest, constructive, structured feedback.

Always respond with ONLY a valid JSON object with exactly these fields:
{
  "relevance_score": <integer 1-10>,
  "strengths": [<list of concise strings>],
  "gaps": [<list of concise strings>],
  "suggestions": [<list of actionable strings>],
  "summary": "<one paragraph plain English summary>"
}

Guidelines:
- relevance_score: How well the snippet aligns with the project (1=no alignment, 10=perfect fit)
- strengths: What the application does well (2-4 items)
- gaps: Missing skills, experience, or clarity (1-4 items)
- suggestions: Concrete advice for improving the application or skill set (2-4 items)
- summary: A balanced, professional summary suitable for the student to read
"""


async def generate_feedback(
    snippet: str,
    project_title: str,
    project_description: str,
) -> dict:
    """
    Calls OpenAI gpt-4o-mini and returns parsed feedback as a dict.
    Raises ValueError if the model returns non-JSON or missing fields.
    """
    user_message = f"""
PROJECT TITLE: {project_title}
PROJECT DESCRIPTION: {project_description}

STUDENT APPLICATION SNIPPET:
{snippet}
"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT.strip()},
            {"role": "user", "content": user_message.strip()},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    parsed = json.loads(raw)

    # Validate required fields
    required = {"relevance_score", "strengths", "gaps", "suggestions", "summary"}
    missing = required - parsed.keys()
    if missing:
        raise ValueError(f"OpenAI response missing fields: {missing}")

    # Coerce types
    parsed["relevance_score"] = int(parsed["relevance_score"])
    parsed["strengths"] = list(parsed.get("strengths", []))
    parsed["gaps"] = list(parsed.get("gaps", []))
    parsed["suggestions"] = list(parsed.get("suggestions", []))
    parsed["summary"] = str(parsed.get("summary", ""))

    return parsed
