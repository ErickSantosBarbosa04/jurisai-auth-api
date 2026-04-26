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
            
        # Verificação de duplicidade de RGM para integridade acadêmica
        rgm_check = db.query(models.User).filter(models.User.rgm_matriz == data.rgm_matriz).first()
        if rgm_check:
            raise HTTPException(status_code=400, detail="Este RGM já está vinculado a uma conta.")

        # 2. Criação do usuário com metadados de consentimento (Requisito 4.5 e 4.7)
        new_user = models.User(
            email=normalized_email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,          # NOVO: Nome do Aluno
            rgm_matriz=data.rgm_matriz,        # NOVO: Matrícula
            university=data.university,        # NOVO: Instituição
            semester=data.semester,            # NOVO: Semestre
            lgpd_consent=True,
            consent_purpose="Análise jurídica e personalização acadêmica", 
            consent_date=datetime.now(timezone.utc), 
            terms_version="2026.1"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = create_access_token({"sub": str(new_user.id)}) # ID agora é string (UUID)
        
        # RETORNO CORRIGIDO: Dados na raiz para o Front-end
        return {
            "access_token": token,
            "token_type": "bearer",
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "is_2fa_enabled": new_user.is_2fa_enabled
        }

    @staticmethod
    # Valida credenciais e 2FA, retornando o Token de Acesso. (Requisito 1.9 e 1.5)
    def authenticate_user(db: Session, email: str, password: str, totp_code: str = None):
        # Busca o usuário pelo e-mail
        user = db.query(models.User).filter(models.User.email == email).first()
        msg_erro_padrao = "E-mail ou senha inválidos."

        if not user:
            logger.warning(f"SERVICE: Usuário não encontrado: {email}")
            raise HTTPException(status_code=401, detail=msg_erro_padrao)

        # --- 1. LÓGICA DE BLOQUEIO (Requisito 1.11) ---
        if user.lockout_until:
            now = datetime.now(timezone.utc)
            # Garante que o tempo do banco tenha fuso horário UTC para comparação exata
            lockout_time = user.lockout_until.replace(tzinfo=timezone.utc) if user.lockout_until.tzinfo is None else user.lockout_until
            
            if now < lockout_time:
                # AINDA BLOQUEADO: Calcula o tempo restante real
                segundos_restantes = int((lockout_time - now).total_seconds())
                minutos = segundos_restantes // 60
                
                if minutos > 0:
                    aviso = f"{minutos} minutos"
                else:
                    aviso = f"{segundos_restantes} segundos"
                
                logger.warning(f"BLOQUEIO ATIVO: Tentativa negada para {email}")
                raise HTTPException(
                    status_code=403, 
                    detail=f"Muitas tentativas falhas. Tente novamente em {aviso}."
                )
            else:
                # O TEMPO PASSOU: Forçamos o reset total com commit isolado
                try:
                    user.failed_login_attempts = 0
                    user.lockout_until = None
                    db.add(user)
                    db.flush()
                    db.commit()
                    db.refresh(user)
                    logger.info(f"SERVICE: Bloqueio expirado. Ficha limpa para {email}")
                except Exception as e:
                    db.rollback()
                    logger.error(f"ERRO AO RESETAR DB: {str(e)}")

        # --- 2. VALIDAÇÃO DE 2FA (Requisito 1.5) ---
        # Se o 2FA estiver ativado e o código for enviado, validamos primeiro
        if user.is_2fa_enabled and totp_code and totp_code not in ["", "null"]:
            try:
                raw_secret = decrypt(user.totp_secret)
                if verify_totp(raw_secret, totp_code):
                    # Sucesso no 2FA: Reseta falhas e gera token
                    user.failed_login_attempts = 0
                    user.lockout_until = None
                    db.add(user)
                    db.commit()

                    token = create_access_token({"sub": str(user.id)})
                    logger.info(f"SERVICE: Login 2FA bem-sucedido: {email}")
                    return {"access_token": token, "token_type": "bearer"}
                else:
                    # Código 2FA errado conta como falha de segurança
                    AuthService._registrar_falha(db, user)
                    logger.warning(f"SERVICE: 2FA inválido para: {email}")
                    raise HTTPException(status_code=401, detail="Código 2FA inválido")
            except Exception as e:
                if isinstance(e, HTTPException): raise e
                logger.error(f"SERVICE: Erro ao processar 2FA: {str(e)}")
                raise HTTPException(status_code=500, detail="Erro interno ao validar 2FA")

        # --- 3. VALIDAÇÃO DA SENHA (Requisito 1.2 e 1.6) ---
        if not verify_password(password, user.hashed_password):
            # Registra a falha no banco de dados (incrementa tentativas)
            AuthService._registrar_falha(db, user)
            logger.warning(f"SERVICE: Falha de senha para: {email}")
            raise HTTPException(status_code=401, detail=msg_erro_padrao)
        
        # Se a senha está correta, mas o 2FA é obrigatório e não foi enviado
        if user.is_2fa_enabled and not totp_code:
            logger.info(f"SERVICE: MFA solicitado (Senha OK) para: {email}")
            raise HTTPException(status_code=401, detail="Código 2FA obrigatório")
                
        # --- 4. SUCESSO NO LOGIN ---
        # Login normal bem-sucedido: Reseta falhas e gera token
        user.failed_login_attempts = 0
        user.lockout_until = None
        db.add(user)
        db.commit()

        token = create_access_token({"sub": str(user.id)})
        logger.info(f"SERVICE: Login bem-sucedido: {email}")
        return {"access_token": token, "token_type": "bearer"}
    
    @staticmethod
    def _registrar_falha(db: Session, user: models.User):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            # Usa UTC para salvar no banco (Requisito 1.11)
            user.lockout_until = datetime.now(timezone.utc) + timedelta(minutes=1)
            db.commit()
            logger.error(f"REQ 1.11: Conta {user.email} bloqueada por 1 minuto.")
            raise HTTPException(
                status_code=403, 
                detail="Muitas tentativas falhas. Bloqueado por 1 minuto."
            )
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
