import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.security import generate_totp_secret, verify_totp, get_totp_uri
from app.core.crypto import encrypt, decrypt

# Definimos o router com o prefixo para as rotas de 2FA
router = APIRouter(prefix="/auth/2fa", tags=["Multi-Factor Authentication"])

logger = logging.getLogger(__name__)

@router.post("/setup", response_model=schemas.TOTPSetupResponse)
def setup_2fa(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Gera um novo segredo TOTP e armazena criptografado (Requisito 3.4).
    """
    secret = generate_totp_secret()
    # Criptografia em repouso conforme exigido no requisito 3.4
    current_user.totp_secret = encrypt(secret)   
    current_user.is_2fa_enabled = False
    db.commit()
    
    logger.info(f"Setup de 2FA iniciado para usuário: {current_user.id}")
    return {"secret": secret, "qr_uri": get_totp_uri(secret, current_user.email)}


@router.post("/verify")
def verify_2fa(
    data: schemas.TOTPVerifyRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Valida o código para ativar definitivamente o 2FA (Requisito 1.6).
    """
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA não configurado. Faça o setup primeiro.")
    
    # Descriptografa o segredo para poder validar o código enviado
    raw_secret = decrypt(current_user.totp_secret)   
    
    if not verify_totp(raw_secret, data.code):
        logger.warning(f"Falha na verificação de 2FA para usuário: {current_user.id}")
        raise HTTPException(status_code=400, detail="Código 2FA inválido")
    
    current_user.is_2fa_enabled = True
    db.commit()
    
    logger.info(f"2FA ativado com sucesso para usuário: {current_user.id}")
    return {"message": "2FA ativado com sucesso"}