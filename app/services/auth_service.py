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
        
        # 2. Verificação de Duplicidade por E-mail (Requisito 1.3)
        user = db.query(models.User).filter(models.User.email == normalized_email).first()
        if user:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado.")

        # 3. Criação do usuário com metadados de consentimento (Requisito 4.5 e 4.7)
        new_user = models.User(
            email=normalized_email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            university=data.university,
            semester=data.semester,
            profile_type=data.profile_type,
            legal_specialty=data.legal_specialty,
            lgpd_consent=True,
            consent_purpose="Autenticação e segurança da conta JurisAI", 
            consent_date=datetime.now(timezone.utc), 
            terms_version="2026.1"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Geração do token para permitir acesso imediato à configuração de 2FA
        token = create_access_token({"sub": str(new_user.id)})
        
        # RETORNO: Dados necessários para o redirecionamento e ativação do MFA
        return {
            "access_token": token,
            "token_type": "bearer",
            "id": new_user.id,
            "email": new_user.email,
            "is_2fa_enabled": new_user.is_2fa_enabled,
            "full_name": new_user.full_name
        }

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str, totp_code: str = None):
        email = email.lower().strip()
        user = db.query(models.User).filter(models.User.email == email).first()
        msg_erro_padrao = "E-mail ou senha inválidos."
        
        # 1. VALIDAÇÃO DE EXISTÊNCIA
        if not user:
            logger.warning(f"SERVICE: Usuário não encontrado: {email}")
            raise HTTPException(status_code=401, detail=msg_erro_padrao)

        # 2. LÓGICA DE BLOQUEIO (Requisito 1.11)
        if user.lockout_until:
            now = datetime.now(timezone.utc)
            # Garante que o tempo de bloqueio seja comparável (offset-aware)
            lockout_time = user.lockout_until.replace(tzinfo=timezone.utc) if user.lockout_until.tzinfo is None else user.lockout_until
            
            if now < lockout_time:
                segundos_restantes = int((lockout_time - now).total_seconds())
                minutos = segundos_restantes // 60
                tempo_aviso = f"{minutos} minutos" if minutos > 0 else f"{segundos_restantes} segundos"
                
                raise HTTPException(
                    status_code=403, 
                    detail=f"Muitas tentativas falhas. Tente novamente em {tempo_aviso}."
                )
            else:
                # O tempo de bloqueio já passou, limpamos os contadores
                user.failed_login_attempts = 0
                user.lockout_until = None
                db.commit()

        # 3. VALIDAÇÃO DA SENHA (Primeira barreira)
        if not verify_password(password, user.hashed_password):
            AuthService._registrar_falha(db, user)
            raise HTTPException(status_code=401, detail=msg_erro_padrao)

        # 4. VALIDAÇÃO DE 2FA (Requisito 1.5)
        # Se a senha está OK, mas o 2FA está ativo:
        if user.is_2fa_enabled:
            # Caso 4.1: O usuário não enviou o código ainda (redirecionar para duasEtapa.html)
            if not totp_code or totp_code in ["", "null"]:
                logger.info(f"SERVICE: Senha correta, solicitando 2FA para: {email}")
                raise HTTPException(status_code=401, detail="Código 2FA obrigatório")
            
            # Caso 4.2: O usuário enviou o código, vamos validar
            try:
                raw_secret = decrypt(user.totp_secret)
                if verify_totp(raw_secret, totp_code):
                    logger.info(f"SERVICE: Login com 2FA aprovado para: {email}")
                else:
                    AuthService._registrar_falha(db, user)
                    raise HTTPException(status_code=401, detail="Código 2FA inválido")
            except Exception as e:
                if isinstance(e, HTTPException): raise e
                logger.error(f"SERVICE: Erro ao processar 2FA: {str(e)}")
                raise HTTPException(status_code=500, detail="Erro interno ao validar 2FA")

        # 5. SUCESSO FINAL
        user.failed_login_attempts = 0
        user.lockout_until = None
        db.commit()

        token = create_access_token({"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer"}
    
    @staticmethod
    def _registrar_falha(db: Session, user: models.User):
        user.failed_login_attempts += 1
        # Bloqueia ao atingir 5 tentativas falhas
        if user.failed_login_attempts >= 5:
            user.lockout_until = datetime.now(timezone.utc) + timedelta(minutes=1)
            db.commit()
            raise HTTPException(
                status_code=403, 
                detail="Muitas tentativas falhas. Bloqueado por 1 minuto."
            )
        db.commit()

    @staticmethod
    def blacklist_token(db: Session, request: Request, current_user: models.User):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=400, detail="Header de autorização ausente")
        
        token = auth_header.split(" ")[1] 
        db_token = TokenBlacklist(token=token)
        db.add(db_token)
        db.commit()
        return {"detail": "Sessão encerrada com sucesso"}