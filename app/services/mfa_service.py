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
        # --- TRAVA DE SEGURANÇA (Requisito para evitar loops de geração) ---
        # Se o usuário já tem um segredo e ainda não ativou o 2FA, 
        # retornamos o que já existe para evitar mudanças infinitas no QR Code.
        if current_user.totp_secret and not current_user.is_2fa_enabled:
            logger.info(f"SERVICE: Retornando segredo existente para o usuário {current_user.id}")
            secret = decrypt(current_user.totp_secret)
            return {
                "secret": secret,
                "qr_uri": get_totp_uri(secret, current_user.email)
            }
        # -------------------------------------------------------------------

        # 1. Gera o segredo novo (Só roda na primeira vez ou se for um reset)
        secret = generate_totp_secret()
        
        # 2. Criptografa e coloca no objeto do usuário
        current_user.totp_secret = encrypt(secret)
        current_user.is_2fa_enabled = False 

        # 3. Sincroniza com a sessão atual do banco
        current_user = db.merge(current_user) 

        # 4. Salva as alterações
        db.commit()
        db.refresh(current_user)

        logger.info(f"SERVICE: Novo segredo gerado e salvo para o usuário: {current_user.id}")
        
        return {
            "secret": secret,
            "qr_uri": get_totp_uri(secret, current_user.email)
    }

    @staticmethod
    # Nova função específica para o fluxo de LOGIN (Requisito 1.5)
    def verify_2fa(db: Session, current_user: User, data: schemas.TOTPVerifyRequest):
        if not current_user.totp_secret:
            raise HTTPException(status_code=400, detail="2FA ainda nao foi configurado")

        try:
            raw_secret = decrypt(current_user.totp_secret)
        except Exception as e:
            logger.error(f"SERVICE: Erro ao descriptografar segredo para {current_user.id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Erro interno de seguranca")

        if not verify_totp(raw_secret, data.code):
            logger.warning(f"SERVICE: Codigo 2FA invalido na ativacao para usuario {current_user.id}")
            raise HTTPException(status_code=400, detail="Codigo 2FA invalido")

        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario nao encontrado")

        user.is_2fa_enabled = True
        db.commit()
        db.refresh(user)

        logger.info(f"SERVICE: 2FA ativado para usuario {user.id}")
        return {"message": "2FA ativado com sucesso"}

    @staticmethod
    def verify_login_2fa(db: Session, email: str, code: str):
        # 1. Busca o usuário pelo e-mail (já que ele não está logado ainda)
        user = db.query(User).filter(User.email == email).first()
        
        if not user or not user.totp_secret:
            logger.warning(f"SERVICE: Tentativa de 2FA para usuário inexistente ou sem 2FA: {email}")
            raise HTTPException(status_code=401, detail="Usuário não encontrado ou 2FA não configurado")

        # 2. Descriptografa o segredo do banco
        try:
            raw_secret = decrypt(user.totp_secret)
        except Exception as e:
            logger.error(f"SERVICE: Erro ao descriptografar segredo para {email}: {str(e)}")
            raise HTTPException(status_code=500, detail="Erro interno de segurança")

        # 3. Valida o código do Authenticator
        from app.core.security import create_access_token # Garanta que a importação está correta
        
        if verify_totp(raw_secret, code):
            # CÓDIGO OK! Agora sim geramos o token de acesso definitivo
            token = create_access_token({"sub": str(user.id)})
            logger.info(f"SERVICE: Login 2FA realizado com sucesso para: {email}")
            return {"access_token": token, "token_type": "bearer"}
        else:
            logger.warning(f"SERVICE: Código 2FA inválido no login para: {email}")
            raise HTTPException(status_code=401, detail="Código 2FA inválido")
