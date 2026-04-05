import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Importamos a base do banco e a engine para subir as tabelas
from app.core.db.database import Base, engine
# Importamos as configurações centralizadas
from app.core.config import settings 
# Importamos todos os seus roteadores organizados
from app.routers import auth, mfa, user, password_reset

# 1. Configuração de Logs (Atende Requisito 5.1 e 5.2) 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# 2. Inicialização do Banco de Dados
# Isso garante que as tabelas sejam criadas ao iniciar a API
Base.metadata.create_all(bind=engine)

# 3. Configuração do Rate Limit (Atende Requisito 1.11) [cite: 16]
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title=settings.PROJECT_NAME)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 4. Middlewares de Segurança
# CORS: Permite que o front-end acesse a API
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# Forçar HTTPS em produção (Atende Requisito 3.1 e 3.2) 
@app.middleware("http")
async def enforce_https(request: Request, call_next):
    if settings.ENVIRONMENT == "production":
        if request.url.scheme == "http":
            https_url = request.url.replace(scheme="https")
            logging.warning(f"Conexão insegura bloqueada: {request.url}")
            return RedirectResponse(url=str(https_url), status_code=301)
    return await call_next(request)

# 5. Registro das Rotas (Arquitetura Modular - Requisito 6.2) 
app.include_router(auth.router)           # Login, Register, Logout
app.include_router(mfa.router)            # Setup e Verify do 2FA
app.include_router(user.router)           # Perfil e LGPD (Export/Delete)
app.include_router(password_reset.router) # Recuperação de senha