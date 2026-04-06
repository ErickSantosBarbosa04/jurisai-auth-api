from passlib.context import CryptContext
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import pyotp
# Importamos as configurações centralizadas
from app.core.config import settings 

# Configuração do algoritmo de Hash (Requisito 1.1)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__ident="2b")

# --- LÓGICA DE SENHAS ---
def hash_password(password: str) -> str:
    """Gera o hash da senha usando bcrypt direto (Resolve bug do Python 3.13)."""
    # Transforma a senha em bytes
    pwd_bytes = password.encode('utf-8')
    # Gera o salt e o hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    # Retorna como string para salvar no banco
    return hashed.decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    """Verifica se a senha plana coincide com o hash."""
    try:
        return bcrypt.checkpw(
            plain.encode('utf-8'), 
            hashed.encode('utf-8')
        )
    except Exception:
        return False

# --- LÓGICA DE TOKENS (JWT) ---
def create_access_token(data: dict) -> str:
    """Cria o token de acesso com tempo de expiração (Requisito 1.9)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_token(token: str) -> dict | None:
    """Valida o token JWT recebido nas requisições."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

# --- LÓGICA DE 2FA (TOTP) ---
def generate_totp_secret() -> str:
    """Gera um segredo aleatório em Base32 para o 2FA (Requisito 1.5)."""
    return pyotp.random_base32()

def verify_totp(secret: str, code: str) -> bool:
    """Valida se o código inserido pelo usuário é válido para o segredo."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code)

def get_totp_uri(secret: str, email: str) -> str:
    """Gera a URI para o QR Code do Google Authenticator."""
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="JurisAI")