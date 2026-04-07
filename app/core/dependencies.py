from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.db.database import SessionLocal
from app import models
from app.core.security import verify_token
from app.models.UserModel import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(models.User).filter(models.User.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    blacklisted = db.query(models.TokenBlacklist).filter(models.TokenBlacklist.token == token).first()
    if blacklisted:
        raise HTTPException(status_code=401, detail="Sessão encerrada, faça login novamente")
    return user
