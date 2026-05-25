import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session

# Importações do nosso ecossistema JurisAI
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.services.auth_service import AuthService
from app.models.UserModel import User
from app.core.crypto import decrypt
from app.core.security import verify_totp, get_password_hash

# Limiter contra Força Bruta (Atende Requisito 1.11)
from app.main import limiter 

router = APIRouter(prefix="/auth", tags=["Authentication"])

logger = logging.getLogger(__name__)

#registro de novos usuários (Requisito 1.2) e (Requisito 1.3) - A validação de regras de negócio e segurança está isolada no AuthService para manter o router limpo e focado em rotas.
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):

    return AuthService.register_user(db, data)

#verifica se o email existe e se o usuário tem 2FA para iniciar o processo de recuperação de senha seguro
@router.post("/check-email")
def check_email(data: schemas.EmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        logger.warning(f"RECUPERAÇÃO: Tentativa falha com e-mail não cadastrado ({data.email}).")
        raise HTTPException(status_code=404, detail="E-mail não encontrado em nossa base.")
    
    # Se o usuário não tem o Google Authenticator ativado, ele não tem acesso ao fluxo
    if not user.totp_secret:
        logger.info(f"RECUPERAÇÃO: Usuário {data.email} tentou recuperar, mas não tem 2FA.")
        raise HTTPException(status_code=400, detail="Este usuário não possui 2FA configurado.")

    return {"message": "E-mail validado. Prossiga para inserir o código 2FA."}

#recebe o código do Google Authenticator e valida se o usuário realmente é o dono da conta
@router.post("/recuperar-confirmar")
def recuperar_confirmar(data: schemas.ValidarRecuperacaoRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not user.totp_secret:
        raise HTTPException(status_code=404, detail="Usuário ou configuração de 2FA não encontrados.")

    # Abre o cofre do banco para conferir a chave original
    raw_secret = decrypt(user.totp_secret)
    
    if not verify_totp(raw_secret, data.code):
        logger.warning(f"RECUPERAÇÃO: Código 2FA incorreto para o e-mail {data.email}.")
        raise HTTPException(status_code=400, detail="Código 2FA inválido ou expirado.")
    
    # Se passou pelas defesas, o usuário tem passe livre para trocar a senha
    logger.info(f"RECUPERAÇÃO: 2FA validado com sucesso para {data.email}.")
    return {"message": "2FA validado com sucesso. Permissão concedida para redefinir senha."}


@router.post("/redefinir-senha")
def redefinir_senha(data: schemas.NovaSenhaFinalRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Criptografa a nova senha antes de salvar
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    
    logger.info(f"SEGURANÇA: Senha alterada com sucesso para o usuário {data.email}.")
    return {"message": "Senha atualizada com sucesso! Faça login novamente com sua nova senha."}

#Adicionando limite para o endpoint de login para evitar ataques de força bruta (Requisito 1.11)
@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit("5/minute") 
def login(request: Request, data: schemas.LoginRequest, db: Session = Depends(get_db)):

    return AuthService.authenticate_user(
        db, 
        data.email, 
        data.password, 
        data.totp_code
    )

#uso do blackslist para invalidar tokens (Requisito 1.10)
@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    logger.info(f"SESSÃO: Usuário {current_user.email} encerrou a sessão (Logout simples).")
    return AuthService.blacklist_token(db, request, current_user)


@router.post("/logout-all", status_code=status.HTTP_200_OK)
def logout_all_devices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.tokens_valid_after = datetime.now(timezone.utc)
    db.commit()

    logger.info(f"SESSÃO: Usuário {current_user.email} desconectado de todos os dispositivos.")
    return {"message": "Desconectado de todos os dispositivos com sucesso. Sessões antigas invalidadas."}