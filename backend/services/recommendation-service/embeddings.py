"""OpenAI embedding wrapper using text-embedding-3-small (1536 dims)."""

import os
from openai import OpenAI

MODEL = "text-embedding-3-small"
DIMENSIONS = 1536

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


def embed_text(text: str) -> list[float]:
    """Return a 1536-dim embedding vector for the given text."""
    response = _get_client().embeddings.create(
        input=text,
        model=MODEL,
        dimensions=DIMENSIONS,
    )
    return response.data[0].embedding
