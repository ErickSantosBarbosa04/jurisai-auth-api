import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.UserModel import User
from app.schema import schemas
from app.core.security import generate_totp_secret, verify_totp, get_totp_uri
from app.core.crypto import encrypt, decrypt

logger = logging.getLogger(__name__)

# Logica de geração, Rotas de verificação após o login. (Requisito 1.5) a (Requisito 1.6)
class MFAService:
    @staticmethod
    #Gera um novo segredo TOTP e armazena criptografado (Requisito 3.4).
    def setup_2fa(db: Session, current_user: User):
    
        secret = generate_totp_secret()
        # Criptografia em repouso conforme exigido no requisito 3.4
        current_user.totp_secret = encrypt(secret)   
        current_user.is_2fa_enabled = False
        db.commit()
        
        logger.info(f"SERVICE: Setup de 2FA iniciado para usuário: {current_user.id}")
        return {
            "secret": secret, 
            "qr_uri": get_totp_uri(secret, current_user.email)
        }

    @staticmethod
    #Valida o código para ativar definitivamente o 2FA (Requisito 1.6).
    def verify_2fa(db: Session, current_user: User, data: schemas.TOTPVerifyRequest):
        if not current_user.totp_secret:
            raise HTTPException(status_code=400, detail="2FA não configurado. Faça o setup primeiro.")
         
        # Descriptografa o segredo para poder validar o código enviado
        raw_secret = decrypt(current_user.totp_secret)   
        
        if not verify_totp(raw_secret, data.code):
            logger.warning(f"SERVICE: Falha na verificação de 2FA para usuário: {current_user.id}")
            raise HTTPException(status_code=400, detail="Código 2FA inválido")
        
        current_user.is_2fa_enabled = True
        db.commit()
        
        logger.info(f"SERVICE: 2FA ativado com sucesso para usuário: {current_user.id}")
        return {"message": "2FA ativado com sucesso"}