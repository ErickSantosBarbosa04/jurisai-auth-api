from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import pyotp
from app.core.config import settings 
import logging

# Configuração do algoritmo de Hash (Requisito 1.1) a (Requisito 1.4)
# com um sistema de divisao de vias controle de consumo de ram e tempo de processamento.
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto", 
    argon2__time_cost=2,          
    argon2__memory_cost=102400,   
    argon2__parallelism=8         
)

# --- LÓGICA DE SENHAS ------------------------------------------------------------------------------
def hash_password(password: str) -> str:
    # Usa o pwd_context parametrizado para gerar o hash com o controle de RAM e CPU
    return pwd_context.hash(password)

# APELIDO PARA O AUTH.PY ENCONTRAR (NÃO APAGAR)
get_password_hash = hash_password

def verify_password(plain: str, hashed: str) -> bool:
    # ---Verifica se a senha plana coincide com o hash.
    try:
        # Delega a verificação de volta para o motor de segurança
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False

# --- LÓGICA DE TOKENS (JWT)  Cria o token de acesso com tempo de expiração (Requsito 1.9)------------------------------------------------------------------------------
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

# --- Validar Token -------------
def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as e:
        logging.warning(f"Token recusado ou expirado. Motivo: {e}")
        return None

# --- LÓGICA DE 2FA (TOTP) (Requisito 1.5) ---------------------------------------------------------------------------
#--- Gera um segredo aleatório em Base32 para o 2FA
def generate_totp_secret() -> str:
    return pyotp.random_base32()

def verify_totp(secret: str, code: str) -> bool:
    # Valida se o código inserido pelo usuário é válido para o segredo com tolerância temporal.
    totp = pyotp.TOTP(secret)
    # valid_window=1 permite 1 ciclo de 30s antes e 1 depois do atual.
    # Isso resolve problemas de sincronização de relógio e latência de rede.
    return totp.verify(code, valid_window=1)

def get_totp_uri(secret: str, email: str) -> str:
    # Gera a URI para o QR Code do Google Authenticator.
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="JurisAI")