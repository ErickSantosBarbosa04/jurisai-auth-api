from cryptography.fernet import Fernet
from app.core.config import settings 

# O segredo do Fernet (AES) agora vem do nosso validador central
# Isso atende ao Requisito 3.6 de Proteção de Chaves
fernet = Fernet(settings.FERNET_KEY.encode())
# Criptografa um valor sensível usando AES-128/256 (Requisito 3.4 e 3.5)
def encrypt(value: str) -> str:
    if not value:
        return ""
    return fernet.encrypt(value.encode()).decode()

def decrypt(value: str) -> str:
    #Descriptografa um valor sensível para uso em memória. (Requisito 3.4)
    if not value:
        return ""
    try:
        return fernet.decrypt(value.encode()).decode()
    except Exception:
        # Retorna vazio ou trata erro se o token for inválido
        return ""