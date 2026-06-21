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
    origin_override = None
    if request.origin_lat is not None and request.origin_lng is not None:
        origin_override = (request.origin_lat, request.origin_lng, request.origin_name)

    dest_override = None
    if request.dest_lat is not None and request.dest_lng is not None:
        dest_override = (request.dest_lat, request.dest_lng, request.dest_name)

    return travel_agent.process_message(
        message=request.message,
        current_lat=request.current_lat,
        current_lng=request.current_lng,
        origin_override=origin_override,
        dest_override=dest_override,
    )
