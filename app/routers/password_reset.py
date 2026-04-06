from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.schema import schemas
from app.services.password_service import PasswordService

router = APIRouter(prefix="/auth", tags=["Password Reset"])

@router.post("/forgot-password")
def forgot_password(data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Controller: Inicia o processo de recuperação de senha.
    Atende Requisito 2.2.
    """
    return PasswordService.create_reset_token(db, data.email)

@router.post("/reset-password")
def reset_password(data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Controller: Finaliza o reset de senha validando o token.
    Atende Requisito 2.2 e Segurança de Hashing.
    """
    return PasswordService.reset_password(db, data)