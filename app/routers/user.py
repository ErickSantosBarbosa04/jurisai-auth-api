import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.dependencies import get_current_user
from app import schemas

# Router focado no usuário e conformidade com a LGPD
router = APIRouter(prefix="/auth", tags=["User Profile & LGPD"])

logger = logging.getLogger(__name__)

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user=Depends(get_current_user)):
    """
    Retorna os dados do usuário logado (Requisito 4.8 - Consulta aos dados).
    """
    return current_user

@router.get("/export-data")
def export_user_data(current_user=Depends(get_current_user)):
    """
    Funcionalidade de exportação dos dados (Requisito 4.9).
    Retorna um dump dos dados do titular em formato legível.
    """
    logger.info(f"Usuário {current_user.id} solicitou exportação de dados (Direito de Portabilidade/Acesso).")
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "is_2fa_enabled": current_user.is_2fa_enabled,
        "message": "Este é o conjunto de dados pessoais coletados pelo JurisAI Auth API conforme a LGPD."
    }

@router.delete("/delete-account", status_code=status.HTTP_200_OK)
def delete_account(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Funcionalidade de exclusão dos dados (Requisito 4.10).
    Garante o 'Direito ao Esquecimento' previsto na LGPD.
    """
    user_email = current_user.email
    db.delete(current_user)
    db.commit()
    
    logger.info(f"Dados do usuário {user_email} excluídos permanentemente a pedido do titular.")
    return {"message": "Sua conta e todos os dados associados foram removidos com sucesso."}