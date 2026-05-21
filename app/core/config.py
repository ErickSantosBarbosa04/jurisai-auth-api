import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Informações Gerais
    PROJECT_NAME: str = "JurisAI"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Banco de Dados
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    # Segurança, Impedir que as chaves fiquem expostas no codigo principal (Requisito 3.6)
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    FERNET_KEY: str = os.getenv("FERNET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")

    # IA / RAG
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.2-3b-preview")
    
    # Requisito 1.9: Tempo de expiração da sessão (JWT)
    try:
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    except (ValueError, TypeError):
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 # Fallback caso o .env esteja mal formatado

    def __init__(self):
        # Validação Crítica (Requisito 1.12)
        if not self.SECRET_KEY or not self.FERNET_KEY:
            raise ValueError("Chaves de segurança CRÍTICAS não foram encontradas no .env!")

settings = Settings()
