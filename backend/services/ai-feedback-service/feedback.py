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
You are an academic mentor evaluating a student group's proposed research project correctly formatted by title and description.
Your job is to provide honest, constructive, structured feedback on their pitch, highlighting if it's clear, technically sound, and well scoped for an academic setting.

Always respond with ONLY a valid JSON object with exactly these fields:
{
  "relevance_score": <integer 1-10>,
  "strengths": [<list of concise strings>],
  "gaps": [<list of concise strings>],
  "suggestions": [<list of actionable strings>],
  "summary": "<one paragraph plain English summary>"
}

Guidelines:
- relevance_score: The overall quality and viability of the project (1=very poor, 10=excellent)
- strengths: What the proposed project outlines well (2-4 items)
- gaps: Missing clarity, scope definition, or fundamental requirements (1-4 items)
- suggestions: Concrete advice for improving the project proposal (2-4 items)
- summary: A balanced, professional summary suitable for the student to read
"""


async def generate_feedback(
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
