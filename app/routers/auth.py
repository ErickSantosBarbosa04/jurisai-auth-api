import logging
from app.schema import schemas
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.models import models
    
from app.security import hash_password, verify_password, create_access_token, verify_totp
from app.core.crypto import decrypt

# Criamos o router. O prefixo ajuda a não precisar repetir "/auth" em cada rota
router = APIRouter(prefix="/auth", tags=["Authentication"])

logger = logging.getLogger(__name__)

@router.post("/register", response_model=schemas.UserResponse)
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user = models.User(email=data.email, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"Novo usuário registrado: {data.email}")
    return user

@router.post("/login", response_model=schemas.TokenResponse)
def login(request: Request, data: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Nota: O limiter será aplicado no main ou injetado aqui
    user = db.query(models.User).filter(models.User.email == data.email).first()
    
    if not user or not verify_password(data.password, user.hashed_password):
        logger.warning(f"Tentativa de login falhou: {data.email}")
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if user.is_2fa_enabled:
        if not data.totp_code:
            raise HTTPException(status_code=401, detail="Código 2FA obrigatório")
        
        raw_secret = decrypt(user.totp_secret)
        if not verify_totp(raw_secret, data.totp_code):
            logger.warning(f"Código 2FA inválido: {data.email}")
            raise HTTPException(status_code=401, detail="Código 2FA inválido")
            
    token = create_access_token({"sub": str(user.id)})
    logger.info(f"Login realizado: {data.email}")
    return {"access_token": token}

@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    raw_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    db.add(models.TokenBlacklist(token=raw_token))
    db.commit()
    logger.info(f"Logout realizado: usuário {current_user.id}")
    return {"message": "Logout realizado com sucesso"}