import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app import models
from app.schema import schemas
from app.core.security import hash_password, verify_password, create_access_token, verify_totp
from app.core.crypto import decrypt

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    # Lógica de criação de conta com verificação de duplicidade. (Requisito 1.1 e 1.3)
    def register_user(db: Session, data: schemas.RegisterRequest):
        if db.query(models.User).filter(models.User.email == data.email).first():
            logger.warning(f"SERVICE: Tentativa de cadastro com e-mail já existente: {data.email}")
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        user = models.User(email=data.email, hashed_password=hash_password(data.password))
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"SERVICE: Novo usuário registrado: {data.email}")
        return user

    @staticmethod
    # Valida credenciais e 2FA, retornando o Token de Acesso. (Requisito 1.9 e 1.5)
    def authenticate_user(db: Session, email: str, password: str, totp_code: str = None):
        # CORREÇÃO: Usar a variável 'email' que vem do argumento, não 'data.email'
        user = db.query(models.User).filter(models.User.email == email).first()
        
        # Validação de usuário e senha
        if not user or not verify_password(password, user.hashed_password):
            logger.warning(f"SERVICE: Falha de autenticação para: {email}")
            raise HTTPException(status_code=401, detail="senha ou email inválidos")
        
        # Validação de 2FA (Apenas se o usuário já tiver ativado o Authenticator)
        if user.is_2fa_enabled:
            if not totp_code:
                # Se o 2FA está ativo mas o código não veio, avisamos o front
                logger.info(f"SERVICE: MFA solicitado para: {email}")
                raise HTTPException(status_code=401, detail="Código 2FA obrigatório")
            
            try:
                # Descriptografa a chave secreta do banco para validar o código do app
                raw_secret = decrypt(user.totp_secret)
                if not verify_totp(raw_secret, totp_code):
                    logger.warning(f"SERVICE: 2FA inválido para: {email}")
                    raise HTTPException(status_code=401, detail="Código 2FA inválido")
            except Exception as e:
                logger.error(f"SERVICE: Erro ao processar 2FA: {str(e)}")
                raise HTTPException(status_code=500, detail="Erro interno ao validar 2FA")
                
        # Geração do Token JWT
        token = create_access_token({"sub": str(user.id)})
        logger.info(f"SERVICE: Login bem-sucedido: {email}")
        return {"access_token": token, "token_type": "bearer"}

    @staticmethod
    # Invalida o token atual (Logout).
    def blacklist_token(db: Session, request, current_user):
        raw_token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if raw_token:
            db.add(models.TokenBlacklist(token=raw_token))
            db.commit()
            logger.info(f"SERVICE: Token invalidado para o usuário: {current_user.id}")
        return {"message": "Logout realizado com sucesso"}