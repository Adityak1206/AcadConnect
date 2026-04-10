"""
main.py — FastAPI application for the AcadConnect AI Feedback Service

Endpoints:
  POST /feedback/generate  — call OpenAI, store result in MongoDB
  GET  /feedback/{request_id}  — retrieve stored feedback
  GET  /health  — health check
"""
import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from db import get_feedback_collection, close_client
from feedback import generate_feedback
from models import FeedbackRequest, FeedbackCreatedResponse, FeedbackResponse, FeedbackSyncRequest, FeedbackSyncResponse

load_dotenv()


# ─── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing to do (Motor connects lazily)
    yield
    # Shutdown: close the MongoDB connection
    await close_client()


# ─── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="AcadConnect AI Feedback Service",
    description="Generates structured AI feedback on student research snippets using OpenAI.",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Routes ────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-feedback-service"}


@app.post("/feedback/generate", response_model=FeedbackCreatedResponse, status_code=201)
async def generate(payload: FeedbackRequest):
    """
    Accepts a student snippet + project context, calls OpenAI for structured
    feedback, and persists it in MongoDB. Returns the feedback_id.
    """
    collection = get_feedback_collection()

    # Check for duplicate: don't regenerate if feedback already exists
    existing = await collection.find_one({"request_id": payload.request_id})
    if existing:
        return FeedbackCreatedResponse(
            feedback_id=str(existing["_id"]),
            status="already_exists",
        )

    # Call OpenAI
    try:
        ai_result = await generate_feedback(
            project_title=payload.project_title,
            project_description=payload.project_description,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI call failed: {str(e)}")

    # Persist to MongoDB
    doc = {
        "request_id": payload.request_id,
        "group_id": payload.group_id,
        "project_id": payload.project_id,
        "snippet": payload.snippet,
        "relevance_score": ai_result["relevance_score"],
        "strengths": ai_result["strengths"],
        "gaps": ai_result["gaps"],
        "suggestions": ai_result["suggestions"],
        "summary": ai_result["summary"],
        "created_at": datetime.now(timezone.utc),
    }

    result = await collection.insert_one(doc)
    feedback_id = str(result.inserted_id)

    return FeedbackCreatedResponse(feedback_id=feedback_id, status="generated")


@app.get("/feedback/{request_id}", response_model=FeedbackResponse)
async def get_feedback(request_id: str):
    """
    Retrieves stored feedback for a given request_id.
    """
    collection = get_feedback_collection()
    doc = await collection.find_one({"request_id": request_id})

    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"No feedback found for request_id '{request_id}'"
        )

    return FeedbackResponse(
        feedback_id=str(doc["_id"]),
        request_id=doc["request_id"],
        group_id=doc["group_id"],
        project_id=doc["project_id"],
        relevance_score=doc["relevance_score"],
        strengths=doc["strengths"],
        gaps=doc["gaps"],
        suggestions=doc["suggestions"],
        summary=doc["summary"],
        created_at=doc["created_at"],
    )


@app.post("/feedback/generate-sync", response_model=FeedbackSyncResponse)
async def generate_sync(payload: FeedbackSyncRequest):
    """
    Accepts a student project title and description, generates AI feedback,
    and returns it immediately without persisting to MongoDB.
    """
    try:
        ai_result = await generate_feedback(
            project_title=payload.project_title,
            project_description=payload.project_description,
        )
        return FeedbackSyncResponse(
            relevance_score=ai_result["relevance_score"],
            strengths=ai_result["strengths"],
            gaps=ai_result["gaps"],
            suggestions=ai_result["suggestions"],
            summary=ai_result["summary"],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI call failed: {str(e)}")


# ─── Local Dev Entry Point ──────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_FEEDBACK_SERVICE_PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
