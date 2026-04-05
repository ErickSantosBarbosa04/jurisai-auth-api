from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

FERNET_KEY = os.getenv("FERNET_KEY")
if not FERNET_KEY:
    raise ValueError("FERNET_KEY não foi definida nas variáveis de ambiente!")

fernet = Fernet(FERNET_KEY.encode())

def encrypt(value: str) -> str:
    """Criptografa um valor com AES-256 (Fernet)."""
    return fernet.encrypt(value.encode()).decode()

def decrypt(value: str) -> str:
    """Descriptografa um valor com AES-256 (Fernet)."""
    return fernet.decrypt(value.encode()).decode()