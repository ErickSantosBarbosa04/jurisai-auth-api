import secrets
import logging
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from .. import models
from ..core.dependencies import get_db  # ← CORRIGIDO aqui

router = APIRouter(prefix="/auth", tags=["password-reset"])
logger = logging.getLogger(__name__)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.UserModel).filter(models.UserModel.email == data.email).first()

    logger.info(f"Solicitação de recuperação de senha para: {data.email}")

    if not user:
        return {"message": "Se o e-mail existir, enviaremos as instruções."}

    token = secrets.token_urlsafe(32)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)

    reset_token = models.PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()

    logger.info(f"Token de recuperação gerado para user_id={user.id}")
    return {"message": "Instruções enviadas.", "token": token}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == data.token,
        models.PasswordResetToken.used == False
    ).first()

    if not reset_token:
        logger.warning("Tentativa de reset com token inválido ou já usado.")
        raise HTTPException(status_code=400, detail="Token inválido ou já utilizado.")

    if datetime.datetime.utcnow() > reset_token.expires_at:
        logger.warning(f"Token expirado para user_id={reset_token.user_id}")
        raise HTTPException(status_code=400, detail="Token expirado.")

    user = db.query(models.UserModel).filter(models.UserModel.id == reset_token.user_id).first()
    user.hashed_password = pwd_context.hash(data.new_password)

    reset_token.used = True
    db.commit()

    logger.info(f"Senha redefinida com sucesso para user_id={user.id}")
    return {"message": "Senha redefinida com sucesso."}
