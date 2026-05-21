import secrets
import logging
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app import models
from app.core.security import hash_password

logger = logging.getLogger(__name__)

class PasswordService:
    RESET_TOKEN_EXPIRE_MINUTES = 15

    @staticmethod
    def create_reset_token_for_user(db: Session, user: models.User):
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=PasswordService.RESET_TOKEN_EXPIRE_MINUTES)

        reset_token = models.PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )

        db.add(reset_token)
        db.commit()

        logger.info(f"SERVICE: Token de recuperação gerado para user_id={user.id}")
        return {
            "reset_token": token,
            "expires_at": expires_at,
            "expires_in_minutes": PasswordService.RESET_TOKEN_EXPIRE_MINUTES,
        }

    @staticmethod
    #Gera a solicitacao de recuperacao sem expor token antes da validacao de identidade.
    def create_reset_token(db: Session, email: str):
        user = db.query(models.User).filter(models.User.email == email.lower().strip()).first()

        # Logica de segurança: Não confirmamos se o e-mail existe para evitar enumeração
        if not user:
            logger.info(f"SERVICE: Solicitação de reset para e-mail inexistente: {email}")
            return {"message": "Se o e-mail existir, enviaremos as instruções."}

        if not user.totp_secret or not user.is_2fa_enabled:
            logger.warning(f"SERVICE: Reset solicitado para conta sem 2FA ativo: {email}")
            raise HTTPException(status_code=400, detail="Esta conta precisa ter 2FA ativo para recuperar senha por este fluxo.")

        return {"message": "E-mail validado. Confirme sua identidade com o Authenticator."}

    @staticmethod
    def _get_valid_reset_token(db: Session, token: str, user_id: str | None = None):
        reset_token = db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.token == token
        ).first()

        if not reset_token or reset_token.used:
            logger.warning("SERVICE: Tentativa de reset com token inválido ou expirado.")
            raise HTTPException(status_code=400, detail="Token inválido ou expirado")

        if user_id and str(reset_token.user_id) != str(user_id):
            logger.warning("SERVICE: Token de reset nao pertence ao usuario informado.")
            raise HTTPException(status_code=400, detail="Token inválido ou expirado")

        expires_at = reset_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            logger.warning("SERVICE: Tentativa de reset com token expirado.")
            raise HTTPException(status_code=400, detail="Token inválido ou expirado")

        return reset_token

    @staticmethod
    def _apply_new_password(db: Session, user: models.User, reset_token: models.PasswordResetToken, new_password: str):
        user.hashed_password = hash_password(new_password)
        user.tokens_valid_after = datetime.now(timezone.utc)
        reset_token.used = True
        db.delete(reset_token)
        db.commit()

        logger.info(f"SERVICE: Senha alterada com sucesso para o usuário ID: {user.id}")
        return {"message": "Senha alterada com sucesso!"}

    @staticmethod
    #Eliminar token usado e atualizar senha usando hash
    def reset_password(db: Session, data):
        reset_token = PasswordService._get_valid_reset_token(db, data.token)

        # Busca o usuário dono do token
        user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        return PasswordService._apply_new_password(db, user, reset_token, data.new_password)

    @staticmethod
    def reset_password_for_recovery(db: Session, email: str, reset_token_value: str, new_password: str):
        user = db.query(models.User).filter(models.User.email == email.lower().strip()).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        reset_token = PasswordService._get_valid_reset_token(db, reset_token_value, user.id)
        return PasswordService._apply_new_password(db, user, reset_token, new_password)
