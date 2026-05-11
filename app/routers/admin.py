import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.models.UserModel import User
from app.services.user_service import UserService

# Aqui definimos o prefixo isolado para o Admin!
router = APIRouter(prefix="/admin", tags=["Admin Control"])
logger = logging.getLogger(__name__)

@router.get("/users-full", response_model=list[schemas.UserResponse])
def list_all_users_admin(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de administrador")
    
    return db.query(User).all()

@router.patch("/toggle-status/{user_id}")
def alternar_status_usuario(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
        
    alvo = db.query(User).filter(User.id == user_id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    # Se ele NÃO está bloqueado, nós bloqueamos até o ano 2999
    if not alvo.lockout_until:
        alvo.lockout_until = datetime(2999, 12, 31, tzinfo=timezone.utc)
        mensagem = "Usuário Suspenso"
    else:
        # Se ele já estava bloqueado, nós tiramos o bloqueio
        alvo.lockout_until = None
        alvo.failed_login_attempts = 0 
        mensagem = "Usuário Ativado"
        
    db.commit()
    return {"message": mensagem}

@router.post("/force-reset")
def forcar_reset_senha(email_data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
        
    alvo = db.query(User).filter(User.email == email_data.get("email")).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    # Gera um link provisório com o ID do usuário para o Admin copiar
    link_falso_para_copiar = f"https://jurisai-auth-api-production.up.railway.app/frontend/pages/redefinir.html?token=ADMIN_RESET_{alvo.id}"
    
    return {"message": "Link gerado com sucesso!", "link": link_falso_para_copiar}

@router.get("/user-lgpd/{user_id}")
def ver_dados_lgpd_usuario(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
        
    alvo = db.query(User).filter(User.id == user_id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    # Aproveita a função do UserService para puxar a ficha completa
    dados = UserService.export_user_data(alvo)
    return dados