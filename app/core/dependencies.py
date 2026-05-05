from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.db.database import SessionLocal
from app import models
from app.core.security import verify_token
from app.models.UserModel import User
from datetime import datetime, timezone 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # 1. VERIFICAÇÃO DA BLACKLIST (Prioridade para o Requisito 1.10)
    # Bloqueia o acesso imediatamente se o token foi invalidado no logout
    blacklisted = db.query(models.TokenBlacklist).filter(models.TokenBlacklist.token == token).first()
    if blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Sessão encerrada, faça login novamente"
        )

    # 2. VALIDAÇÃO DO TOKEN (Integridade e Expiração)
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token inválido ou expirado"
        )

    # 3. BUSCA DO USUÁRIO
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Payload do token inválido"
        )
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # O "iat" é o momento exato em que o token foi criado
    token_criado_em = payload.get("iat") 
    
    if user.tokens_valid_after and token_criado_em:
        # Garante que a data do banco seja UTC para comparar com o timestamp
        valid_after = user.tokens_valid_after
        if valid_after.tzinfo is None:
            valid_after = valid_after.replace(tzinfo=timezone.utc)
            
        # Se o token for mais velho que o momento em que o usuário clicou em "Desconectar todos"
        if token_criado_em < valid_after.timestamp():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Sua sessão foi encerrada em outro dispositivo."
            )

    return user