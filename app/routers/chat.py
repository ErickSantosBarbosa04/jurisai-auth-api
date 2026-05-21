from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.models.UserModel import User
from app.schema import schemas
from app.services.jurisai_agent_service import JurisAIAgentService


router = APIRouter(prefix="/ai", tags=["JurisAI Chat"])


@router.post("/chat", response_model=schemas.ChatResponse)
def chat_with_jurisai(
    data: schemas.ChatRequest,
    current_user: User = Depends(get_current_user),
):
    user_profile = {
        "profile_type": current_user.profile_type or "estudante",
        "semester": current_user.semester,
        "legal_specialty": current_user.legal_specialty,
    }

    return JurisAIAgentService.answer(
        question=data.question,
        mode=data.mode,
        history=data.history,
        user_profile=user_profile,
    )
