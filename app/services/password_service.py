import secrets
import logging
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app import models
from app.core.security import hash_password

logger = logging.getLogger(__name__)

class PasswordService:
    @staticmethod
    #Gera um token de recuperação de 32 caracteres e salva no banco. (Requisito 2.1 e 2.2)
    #Utilização de logger.info e logger.warning. (Requisito 2.6 e 2.7)
    def create_reset_token(db: Session, email: str):
    
        user = db.query(models.User).filter(models.User.email == email).first()
        
        # Logica de segurança: Não confirmamos se o e-mail existe para evitar enumeração
        if not user:
            logger.info(f"SERVICE: Solicitação de reset para e-mail inexistente: {email}")
            return {"message": "Se o e-mail existir, enviaremos as instruções."}

        # Gera token seguro e define expiração (15 minutos)
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        reset_token = models.PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        
        db.add(reset_token)
        db.commit()

        logger.info(f"SERVICE: Token de recuperação gerado para user_id={user.id}")
        # Em produção, aqui dispararíamos o e-mail real
        return {"message": "Instruções enviadas.", "token": token}

    @staticmethod
    #Eliminar token usado e atualizar senha usando hash
    def reset_password(db: Session, data):
        # Busca e valida o token
        reset_token = db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.token == data.token
        ).first()

        #Token for inválido ou expirado (Requisito 2.5)
        if not reset_token or reset_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            logger.warning("SERVICE: Tentativa de reset com token inválido ou expirado.")
            raise HTTPException(status_code=400, detail="Token inválido ou expirado")

        # Busca o usuário dono do token 
        user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Atualiza a senha com a nossa função segura (Bcrypt corrigido)
        user.hashed_password = hash_password(data.new_password)
        
        # Limpa o token (Segurança: expiracao de token e uso único) (Requisito 2.3 e 2.4)
        db.delete(reset_token)
        db.commit()

        logger.info(f"SERVICE: Senha alterada com sucesso para o usuário ID: {user.id}")
        return {"message": "Senha alterada com sucesso!"}