import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.UserModel import User
from app.schema import schemas
from app.core.security import generate_totp_secret, verify_totp, get_totp_uri
from app.core.crypto import encrypt, decrypt
from app.services.audit_service import AuditService # <-- IMPORTADO AQUI

logger = logging.getLogger(__name__)

class MFAService:
    @staticmethod
    def setup_2fa(db: Session, current_user: User):
        # TRAVA DE SEGURANÇA
        if current_user.totp_secret and not current_user.is_2fa_enabled:
            logger.info(f"SERVICE: Retornando segredo existente para o usuário {current_user.id}")
            secret = decrypt(current_user.totp_secret)
            return {
                "secret": secret,
                "qr_uri": get_totp_uri(secret, current_user.email)
            }

        secret = generate_totp_secret()
        current_user.totp_secret = encrypt(secret)
        current_user.is_2fa_enabled = False 
        current_user = db.merge(current_user) 
        db.commit()
        db.refresh(current_user)

        # 📋 LOG: Configuração inicial
        AuditService.registrar_acao(db, str(current_user.id), "Iniciada configuração de 2FA (QR Code gerado).")

        logger.info(f"SERVICE: Novo segredo gerado para usuário: {current_user.id}")
        return {
            "secret": secret,
            "qr_uri": get_totp_uri(secret, current_user.email)
        }

    @staticmethod
    def verify_2fa(db: Session, current_user: User, data: schemas.TOTPVerifyRequest):
        if not current_user.totp_secret:
            raise HTTPException(status_code=400, detail="2FA ainda nao foi configurado")

        try:
            raw_secret = decrypt(current_user.totp_secret)
        except Exception as e:
            logger.error(f"SERVICE: Erro ao descriptografar segredo para {current_user.id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Erro interno de seguranca")

        if not verify_totp(raw_secret, data.code):
            # 📋 LOG: Tentativa falha de ativação
            AuditService.registrar_acao(db, str(current_user.id), "Tentativa de ativação do 2FA falhou (código inválido).")
            logger.warning(f"SERVICE: Codigo 2FA invalido na ativacao para usuario {current_user.id}")
            raise HTTPException(status_code=400, detail="Codigo 2FA invalido")

        user = db.query(User).filter(User.id == current_user.id).first()
        user.is_2fa_enabled = True
        db.commit()
        db.refresh(user)

        # 📋 LOG: 2FA Ativado com sucesso
        AuditService.registrar_acao(db, str(user.id), "Autenticação em duas etapas (2FA) ativada com sucesso.")

        logger.info(f"SERVICE: 2FA ativado para usuario {user.id}")
        return {"message": "2FA ativado com sucesso"}

    @staticmethod
    def verify_login_2fa(db: Session, email: str, code: str):
        user = db.query(User).filter(User.email == email).first()
        
        if not user or not user.totp_secret:
            logger.warning(f"SERVICE: Tentativa de 2FA para usuário inexistente: {email}")
            raise HTTPException(status_code=401, detail="Usuário não encontrado ou 2FA não configurado")

        try:
            raw_secret = decrypt(user.totp_secret)
        except Exception as e:
            logger.error(f"SERVICE: Erro ao descriptografar segredo para {email}: {str(e)}")
            raise HTTPException(status_code=500, detail="Erro interno de segurança")

        from app.core.security import create_access_token
        
        if verify_totp(raw_secret, code):
            token = create_access_token({"sub": str(user.id)})
            
            # 📋 LOG: 2FA validado no login
            AuditService.registrar_acao(db, str(user.id), "Segunda etapa (2FA) validada com sucesso durante login.")
            
            logger.info(f"SERVICE: Login 2FA realizado com sucesso para: {email}")
            return {
                "access_token": token, 
                "token_type": "bearer",
                "is_admin": user.is_admin
            }
        else:
            # 📋 LOG: Tentativa falha no Login 2FA
            AuditService.registrar_acao(db, str(user.id), "Falha na validação do código 2FA durante o login.")
            logger.warning(f"SERVICE: Código 2FA inválido no login para: {email}")
            raise HTTPException(status_code=401, detail="Código 2FA inválido")