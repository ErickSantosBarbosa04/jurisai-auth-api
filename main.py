import logging
import traceback # Para capturar erros detalhados
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.db.database import Base, engine
from app.core.config import settings 
from app.routers import auth, mfa, user, password_reset

# Configuração de Logs (Atende Requisito 5.1 e 5.2) 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Inicialização do Banco de Dados
# Isso garante que as tabelas sejam criadas ao iniciar a API
Base.metadata.create_all(bind=engine)

# Configuração do Rate Limit (Atende Requisito 1.11) 
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title=settings.PROJECT_NAME)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middlewares de Segurança
# CORS: Permite que o front-end acesse a API (Requisito 3.6)
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], # Permite todas as origens para facilitar o desenvolvimento do TCC
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Middleware de Captura de Erros 500 (Auxilia no Debug do PFC)
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logging.error(f"ERRO CRÍTICO NA API: {exc}")
        logging.error(traceback.format_exc()) # Imprime onde o erro aconteceu no terminal
        return JSONResponse(
            status_code=500,
            content={"detail": "Erro interno no servidor. Verifique o terminal do Back-end."}
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

# Registro das Rotas (Arquitetura Modular - Requisito 6.2) 
app.include_router(auth.router)           # Login, Register, Logout
app.include_router(mfa.router)            # Setup e Verify do 2FA
app.include_router(user.router)           # Perfil e LGPD (Export/Delete)
app.include_router(password_reset.router) # Recuperação de senha