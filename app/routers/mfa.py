from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.services.mfa_service import MFAService

router = APIRouter(prefix="/auth/2fa", tags=["Multi-Factor Authentication"])

@router.post("/setup", response_model=schemas.TOTPSetupResponse)
# Solicita o setup de 2FA ao MFAService. (Requisito 3.4)
def setup_2fa(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
     return MFAService.setup_2fa(db, current_user)

@router.post("/verify")
# Validação para ATIVAÇÃO (Precisa estar logado) - Requisito 1.6
def verify_2fa_activation(
    data: schemas.TOTPVerifyRequest, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    return MFAService.verify_2fa(db, current_user, data)

@router.post("/login-verify")
# Validação para LOGIN (NÃO precisa estar logado, apenas e-mail e código) - Requisito 1.5
def verify_2fa_login(
    data: schemas.TOTPVerifyRequest, 
    db: Session = Depends(get_db)
):
    # Note que aqui NÃO tem o current_user, por isso o erro 401 vai sumir!
    return MFAService.verify_login_2fa(db, data.email, data.code)