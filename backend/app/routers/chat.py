from fastapi import APIRouter, Depends
from app.schemas import ChatRequest, ChatResponse
from app.ml.travel_agent import travel_agent
from app.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("", response_model=ChatResponse)
def chat_with_assistant(
    request: ChatRequest,
    current_user = Depends(get_current_user)
):
    return travel_agent.process_message(
        message=request.message,
        current_lat=request.current_lat,
        current_lng=request.current_lng
    )
