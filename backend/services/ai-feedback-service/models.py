"""
models.py — Pydantic schemas for the AI Feedback Service
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FeedbackRequest(BaseModel):
    request_id: str
    group_id: str
    project_id: str
    snippet: str
    project_title: str
    project_description: str


class FeedbackResponse(BaseModel):
    feedback_id: str
    request_id: str
    group_id: str
    project_id: str
    relevance_score: int          # 1–10
    strengths: list[str]
    gaps: list[str]
    suggestions: list[str]
    summary: str
    created_at: datetime


class FeedbackCreatedResponse(BaseModel):
    feedback_id: str
    status: str = "generated"
