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
        # ... (sua lógica de criação anterior permanece igual até o db.refresh)
        user = db.query(models.User).filter(models.User.email == data.email).first()
        if not user: # Apenas segurança após o commit
             user = models.User(email=data.email, hashed_password=hash_password(data.password))
             db.add(user)
             db.commit()
             db.refresh(user)

        token = create_access_token({"sub": str(user.id)})
        
        # RETORNO CORRIGIDO: Colocamos os dados do usuário na raiz do dicionário
        return {
            "access_token": token,
            "token_type": "bearer",
            "id": user.id,
            "email": user.email,
            "is_2fa_enabled": user.is_2fa_enabled
        }

    @staticmethod
    # Valida credenciais e 2FA, retornando o Token de Acesso. (Requisito 1.9 e 1.5)
    def authenticate_user(db: Session, email: str, password: str, totp_code: str = None):
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            logger.warning(f"SERVICE: Usuário não encontrado: {email}")
            raise HTTPException(status_code=401, detail="senha ou email inválidos")

        # --- NOVA LÓGICA: SE VIER O CÓDIGO 2FA, VALIDAMOS ELE PRIMEIRO ---
        if user.is_2fa_enabled and totp_code and totp_code not in ["", "null"]:
            try:
                # Descriptografa a chave secreta do banco para validar o código do app
                raw_secret = decrypt(user.totp_secret)
                if verify_totp(raw_secret, totp_code):
                    # CÓDIGO CERTO! Geramos o token sem precisar validar a senha de novo
                    token = create_access_token({"sub": str(user.id)})
                    logger.info(f"SERVICE: Login 2FA bem-sucedido: {email}")
                    return {"access_token": token, "token_type": "bearer"}
                else:
                    logger.warning(f"SERVICE: 2FA inválido para: {email}")
                    raise HTTPException(status_code=401, detail="Código 2FA inválido")
            except Exception as e:
                logger.error(f"SERVICE: Erro ao processar 2FA: {str(e)}")
                raise HTTPException(status_code=500, detail="Erro interno ao validar 2FA")

        # --- FLUXO NORMAL: SE NÃO VIER O 2FA, VALIDAMOS A SENHA ---
        if not verify_password(password, user.hashed_password):
            logger.warning(f"SERVICE: Falha de senha para: {email}")
            raise HTTPException(status_code=401, detail="senha ou email inválidos")
        
        # Se a senha estiver certa mas o 2FA estiver ativo e NÃO foi enviado o código ainda
        if user.is_2fa_enabled and not totp_code:
            logger.info(f"SERVICE: MFA solicitado (Senha OK) para: {email}")
            # Retornamos um status 200 ou 401 específico para o front saber que deve pedir o código
            raise HTTPException(status_code=401, detail="Código 2FA obrigatório")
                
        # Login normal (caso o usuário não tenha 2FA ativo)
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