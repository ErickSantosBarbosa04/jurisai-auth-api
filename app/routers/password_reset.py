from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.schema import schemas
from app.services.password_service import PasswordService

router = APIRouter(prefix="/auth", tags=["Password Reset"])

@router.post("/forgot-password")
# Inicia o processo de recuperação de senha. (Requisito 2.2)
# AJUSTE: Alterado de ForgotPasswordRequest para EmailRequest para bater com o schemas.py
def forgot_password(data: schemas.EmailRequest, db: Session = Depends(get_db)):
    return PasswordService.create_reset_token(db, data.email)

@router.post("/reset-password")
# Finaliza o reset de senha usando o esquema NovaSenhaFinalRequest (Requisito 2.7)
def reset_password(data: schemas.NovaSenhaFinalRequest, db: Session = Depends(get_db)):
    return PasswordService.reset_password(db, data)