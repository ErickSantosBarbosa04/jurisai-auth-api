import logging
from fastapi import HTTPException, status, Request
from sqlalchemy.orm import Session
from app import models
from app.schema import schemas
from app.core.security import hash_password, verify_password, create_access_token, verify_totp
from app.core.crypto import decrypt
from app.models.TokenBlacklistModel import TokenBlacklist
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    # Lógica de criação de conta com verificação de duplicidade e LGPD. (Requisito 1.1, 1.3, 4.4, 4.5 e 4.7)
    def register_user(db: Session, data: schemas.RegisterRequest):
        # 1. Verificação de consentimento antes de prosseguir (Requisito 4.4)
        if not data.lgpd_consent:
            raise HTTPException(status_code=400, detail="O consentimento da LGPD é obrigatório para criar uma conta.")

        normalized_email = data.email.lower().strip()
        user = db.query(models.User).filter(models.User.email == normalized_email).first()
        if user:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado.")

        # 2. Criação do usuário com metadados de consentimento (Requisito 4.5 e 4.7)
        new_user = models.User(
            email=normalized_email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            profile_type=data.profile_type,
            university=data.university,
            semester=data.semester,
            legal_specialty=data.legal_specialty,
            lgpd_consent=True,
            consent_purpose="Autenticação e segurança da conta JurisAI", 
            consent_date=datetime.now(timezone.utc), 
            terms_version="2026.1"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = create_access_token({"sub": str(new_user.id)})
        
        # RETORNO CORRIGIDO: Dados na raiz para o Front-end
        return {
            "access_token": token,
            "token_type": "bearer",
            "id": new_user.id,
            "email": new_user.email,
            "is_2fa_enabled": new_user.is_2fa_enabled,
            "full_name": new_user.full_name,
            "profile_type": new_user.profile_type,
            "university": new_user.university,
            "semester": new_user.semester,
            "legal_specialty": new_user.legal_specialty
        }

    @staticmethod
    # Valida credenciais e 2FA, retornando o Token de Acesso. (Requisito 1.9 e 1.5)
    def authenticate_user(db: Session, email: str, password: str, totp_code: str = None):
        email = email.lower().strip()
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            logger.warning(f"SERVICE: Usuário não encontrado: {email}")
            raise HTTPException(status_code=401, detail="senha ou email inválidos")

        # 1. VERIFICA SE ESTÁ BLOQUEADO (Requisito 1.11)
        if user.lockout_until:
            now = datetime.now(timezone.utc)
            lockout_time = user.lockout_until.replace(tzinfo=timezone.utc) if user.lockout_until.tzinfo is None else user.lockout_until
            
            if now < lockout_time:
                minutos = int((lockout_time - now).total_seconds() / 60)
                logger.warning(f"BLOQUEIO ATIVO: Tentativa em conta bloqueada: {email}")
                raise HTTPException(
                    status_code=403, 
                    detail=f"Muitas tentativas. Tente novamente em {minutos} minutos."
                )
            
        # 2. SE VIER O CÓDIGO 2FA, VALIDAMOS ELE PRIMEIRO (Requisito 1.5)
        if user.is_2fa_enabled and totp_code and totp_code not in ["", "null"]:
            try:
                raw_secret = decrypt(user.totp_secret)
                if verify_totp(raw_secret, totp_code):
                    # Sucesso: Reseta falhas e gera token
                    user.failed_login_attempts = 0
                    user.lockout_until = None
                    db.commit()

                    token = create_access_token({"sub": str(user.id)})
                    logger.info(f"SERVICE: Login 2FA bem-sucedido: {email}")
                    return {"access_token": token, "token_type": "bearer"}
                else:
                    AuthService._registrar_falha(db, user)
                    logger.warning(f"SERVICE: 2FA inválido para: {email}")
                    raise HTTPException(status_code=401, detail="Código 2FA inválido")
            except Exception as e:
                if isinstance(e, HTTPException): raise e
                logger.error(f"SERVICE: Erro ao processar 2FA: {str(e)}")
                raise HTTPException(status_code=500, detail="Erro interno ao validar 2FA")

        # 3. VALIDAÇÃO DA SENHA (Requisito 1.2 e 1.6)
        if not verify_password(password, user.hashed_password):
            AuthService._registrar_falha(db, user)
            logger.warning(f"SERVICE: Falha de senha para: {email}")
            raise HTTPException(status_code=401, detail="senha ou email inválidos")
        
        # Se a senha está ok mas falta o 2FA
        if user.is_2fa_enabled and not totp_code:
            logger.info(f"SERVICE: MFA solicitado (Senha OK) para: {email}")
            raise HTTPException(status_code=401, detail="Código 2FA obrigatório")
                
        # Login normal: Reseta falhas e gera token
        user.failed_login_attempts = 0
        user.lockout_until = None
        db.commit()

        token = create_access_token({"sub": str(user.id)})
        logger.info(f"SERVICE: Login bem-sucedido: {email}")
        return {"access_token": token, "token_type": "bearer"}
    
    @staticmethod
    def _registrar_falha(db: Session, user: models.User):
        """Método auxiliar para gerenciar punições por falha (Requisito 1.11)"""
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.lockout_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            logger.error(f"REQ 1.11: Conta {user.email} bloqueada por força bruta.")
        db.commit()

    @staticmethod
    # Verificação de blacklist de token (Requisito 1.10)
    def blacklist_token(db: Session, request: Request, current_user: models.User):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=400, detail="Header de autorização ausente")
        
        token = auth_header.split(" ")[1] 
        db_token = TokenBlacklist(token=token)
        db.add(db_token)
        db.commit()
        
        return {"detail": "Sessão encerrada com sucesso"}
