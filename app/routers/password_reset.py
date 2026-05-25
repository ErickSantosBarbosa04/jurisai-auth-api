from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.schema import schemas
from app.services.password_service import PasswordService

router = APIRouter(prefix="/auth", tags=["Password Reset"])

@router.post("/forgot-password")
def forgot_password(data: schemas.EmailRequest, db: Session = Depends(get_db)):
    return PasswordService.create_reset_token(db, data.email)

@router.post("/reset-password")
def reset_password(data: schemas.NovaSenhaFinalRequest, db: Session = Depends(get_db)):
    return PasswordService.reset_password(db, data)