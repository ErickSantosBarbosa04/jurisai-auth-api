from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.services.mfa_service import MFAService

router = APIRouter(prefix="/auth/2fa", tags=["Multi-Factor Authentication"])

@router.post("/setup", response_model=schemas.TOTPSetupResponse)
def setup_2fa(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Controller: Solicita o setup de 2FA ao MFAService.
    Atende Requisito 3.4.
    """
    return MFAService.setup_2fa(db, current_user)

@router.post("/verify")
def verify_2fa(
    data: schemas.TOTPVerifyRequest, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """
    Controller: Delega a validação e ativação do 2FA ao MFAService.
    Atende Requisito 1.6.
    """
    return MFAService.verify_2fa(db, current_user, data)