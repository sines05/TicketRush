import os
from fastapi import FastAPI, Header, Request, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from agent import process_chat_message

app = FastAPI(title="TicketRush AI Agent")

X_INTERNAL_SECRET = os.environ["X_INTERNAL_SECRET"]

class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    thread_id: str
    ui_components: Optional[List[dict]] = []

@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, 
    x_thread_id: Optional[str] = Header(None),
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret")
):
    # Validate internal secret
    if x_internal_secret != X_INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal secret"
        )

    # Use thread_id from body, then header, then default
    thread_id = request.thread_id or x_thread_id or "default-session"
    
    # Process message
    # Note: process_chat_message needs to be updated to return more than just a string if we want ui_components
    result = process_chat_message(request.message, thread_id=thread_id, user_id=request.user_id)
    
    if isinstance(result, dict):
        return ChatResponse(
            reply=result.get("reply", ""),
            thread_id=thread_id,
            ui_components=result.get("ui_components", [])
        )
    
    return ChatResponse(reply=result, thread_id=thread_id)

@app.get("/health")
async def health():
    return {"status": "ok"}
