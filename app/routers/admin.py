import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr

from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.models.UserModel import User
from app.services.user_service import UserService
from app.services.email_service import EmailService

# Aqui definimos o prefixo isolado para o Admin!
router = APIRouter(prefix="/admin", tags=["Admin Control"])
logger = logging.getLogger(__name__)

class AdminUpdateUser(BaseModel):
    email: EmailStr

@router.patch("/update-user/{user_id}")
def admin_update_user(user_id: str, data: AdminUpdateUser, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
        
    alvo = db.query(User).filter(User.id == user_id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    # Verifica se o e-mail novo já não pertence a outra pessoa
    check_email = db.query(User).filter(User.email == data.email).first()
    if check_email and check_email.id != user_id:
        raise HTTPException(status_code=400, detail="Este e-mail já está em uso por outra conta.")

    alvo.email = data.email
    db.commit()
    return {"message": f"E-mail alterado com sucesso para {data.email}!"}

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
        
    email_alvo = email_data.get("email")
    alvo = db.query(User).filter(User.email == email_alvo).first()
    
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    # Gera o link apontando para a sua tela de recuperação com o e-mail já preenchido!
    link_real = f"https://jurisai-auth-api-production.up.railway.app/frontend/pages/esqueci.html?email={email_alvo}"
    
    # Chama o carteiro para entregar a mensagem
    sucesso = EmailService.send_recovery_email(email_alvo, link_real)
    
    if sucesso:
        return {"message": f"E-mail enviado para {email_alvo} com sucesso!"}
    else:
        raise HTTPException(status_code=500, detail="Falha ao enviar e-mail. Verifique as credenciais.")

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