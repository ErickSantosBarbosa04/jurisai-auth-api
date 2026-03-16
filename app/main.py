from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.database import Base, engine
from app.dependencies import get_db, get_current_user
from app import models, schemas
from app.auth import (hash_password, verify_password, create_access_token,
                      generate_totp_secret, verify_totp, get_totp_uri)


Base.metadata.create_all(bind=engine)


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="JurisAI Auth API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.post("/auth/register", response_model=schemas.UserResponse)
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user = models.User(email=data.email, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if user.is_2fa_enabled:
        if not data.totp_code or not verify_totp(user.totp_secret, data.totp_code):
            raise HTTPException(status_code=401, detail="Código 2FA inválido")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token}


@app.post("/auth/logout")
def logout(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    raw_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    db.add(models.TokenBlacklist(token=raw_token))
    db.commit()
    return {"message": "Logout realizado com sucesso"}


@app.post("/auth/2fa/setup", response_model=schemas.TOTPSetupResponse)
def setup_2fa(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    secret = generate_totp_secret()
    current_user.totp_secret = secret
    current_user.is_2fa_enabled = False  # ativa só após verify
    db.commit()
    return {"secret": secret, "qr_uri": get_totp_uri(secret, current_user.email)}


@app.post("/auth/2fa/verify")
def verify_2fa(
    data: schemas.TOTPVerifyRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA não configurado. Faça o setup primeiro.")
    if not verify_totp(current_user.totp_secret, data.code):
        raise HTTPException(status_code=400, detail="Código 2FA inválido")
    current_user.is_2fa_enabled = True
    db.commit()
    return {"message": "2FA ativado com sucesso"}


@app.get("/auth/me", response_model=schemas.UserResponse)
def me(current_user=Depends(get_current_user)):
    return current_user
