import logging
from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.services.auth_service import AuthService

# IMPORTAÇÕES ADICIONAIS PARA OS NOVOS ENDPOINTS
from app.models.UserModel import User
from app.core.crypto import decrypt
from app.core.security import verify_totp, get_password_hash

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

@router.post("/register", status_code=status.HTTP_201_CREATED)

#Delega o registro ao AuthService
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):
    return AuthService.register_user(db, data)

@router.post("/check-email")
# Rota para verificar existência do e-mail antes de prosseguir para o 2FA (Requisito 2.7)
def check_email(data: schemas.EmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        logger.warning(f"RECUPERAÇÃO: Tentativa com e-mail não cadastrado: {data.email}")
        raise HTTPException(status_code=404, detail="E-mail não encontrado em nossa base.")
    
    # Se o usuário existe mas não tem 2FA, ele não conseguiria recuperar por esse fluxo
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Este usuário não possui 2FA configurado.")

    return {"message": "E-mail validado. Prossiga para o 2FA."}

@router.post("/recuperar-confirmar")
# Alterado de RecuperarSenhaRequest para ValidarRecuperacaoRequest
def recuperar_confirmar(data: schemas.ValidarRecuperacaoRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not user.totp_secret:
        raise HTTPException(status_code=404, detail="Usuário ou 2FA não encontrado")

    # Descriptografa e valida o TOTP
    from app.core.crypto import decrypt
    raw_secret = decrypt(user.totp_secret)
    
    if not verify_totp(raw_secret, data.code):
        raise HTTPException(status_code=400, detail="Código 2FA inválido")
    
    # Se chegou aqui, o código está certo! 
    # O seu JS vai receber o "ok" e redirecionar para redefinir.html
    return {"message": "2FA validado com sucesso"}

@router.post("/redefinir-senha")
# Mude para o schema que criamos acima
def redefinir_senha(data: schemas.NovaSenhaFinalRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Aqui você faz o hash da nova senha e salva
    from app.core.security import get_password_hash
    user.hashed_password = get_password_hash(data.new_password)
    
    db.commit()
    logger.info(f"SERVICE: Senha alterada com sucesso para: {data.email}")
    
    return {"message": "Senha atualizada com sucesso! Faça login novamente."}

@router.post("/login", response_model=schemas.TokenResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    # PASSANDO SEM OS NOMES DAS VARIÁVEIS (POR POSIÇÃO)
    return AuthService.authenticate_user(
        db, 
        data.email, 
        data.password, 
        data.totp_code
    )

#--- Implementando token blacklist (Requisito 1.10)
@router.post("/logout")
#Delega a invalidação do token ao AuthService.
def logout(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return AuthService.blacklist_token(db, request, current_user)