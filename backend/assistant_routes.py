"""
Milestone 4 / Extension — Assistant Routes.

API Endpoints for central Event AI Assistant Chatbot.
"""

from __future__ import annotations

from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database import get_db
from security import verify_token
from ai_assistant_engine import generate_assistant_response


router = APIRouter(tags=["AIAssistant"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[ChatMessage]] = None


@router.post("/ai-assistant/chat")
def chat_with_assistant(
    request: ChatRequest,
    db: DBSession = Depends(get_db),
    user: str = Depends(verify_token),
):
    """
    Central Event AI Assistant Endpoint.

    Accepts organizer questions, compiles live database context,
    and returns contextual AI answers across all 7 operational domains.
    """
    if not request.message or len(request.message.strip()) == 0:
        raise HTTPException(
            status_code=400,
            detail="Message content cannot be empty.",
        )

    history_dicts = [h.dict() for h in request.history] if request.history else None
    result = generate_assistant_response(db, request.message.strip(), history=history_dicts)
    return result
