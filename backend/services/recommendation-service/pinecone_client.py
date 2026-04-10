"""Pinecone vector database client."""

import os
from pinecone import Pinecone, ServerlessSpec

INDEX_NAME = None
_pc: Pinecone | None = None
_index = None


def init_pinecone():
    """Initialize Pinecone client and ensure the index exists."""
    global _pc, _index, INDEX_NAME

    INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "acadconnect-faculty")
    api_key = os.getenv("PINECONE_API_KEY")

    _pc = Pinecone(api_key=api_key)

    # Create index if it doesn't exist
    existing = [idx.name for idx in _pc.list_indexes()]
    if INDEX_NAME not in existing:
        _pc.create_index(
            name=INDEX_NAME,
            dimension=1536,  # text-embedding-3-small
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )

    _index = _pc.Index(INDEX_NAME)
    return _index


def get_index():
    """Get the Pinecone index, initializing if needed."""
    global _index
    if _index is None:
        init_pinecone()
    return _index


def upsert_faculty(faculty_id: str, vector: list[float], metadata: dict):
    """Upsert a single faculty vector."""
    idx = get_index()
    idx.upsert(vectors=[{
        "id": faculty_id,
        "values": vector,
        "metadata": metadata,
    }])


def query_similar(vector: list[float], top_k: int = 5) -> list[dict]:
    """Query for the top-K most similar faculty vectors."""
    idx = get_index()
    results = idx.query(vector=vector, top_k=top_k, include_metadata=True)
    return [
        {
            "faculty_id": match.id,
            "score": match.score,
            "metadata": match.metadata,
        }
        for match in results.matches
    ]


def delete_faculty(faculty_id: str):
    """Delete a faculty vector from the index."""
    idx = get_index()
    idx.delete(ids=[faculty_id])
