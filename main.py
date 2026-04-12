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
Base.metadata.create_all(bind=engine)

# Configuração do Rate Limit (Atende Requisito 1.11) 
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None, # Esconde docs em produção
    redoc_url=None
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Middlewares ---

# CORS (Requisito 3.6)
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], # Mantido "*" para facilitar o TCC, mas aceita credenciais
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Captura de Erros 500
# DICA: Esse middleware é vital para o Requisito 5.2 (Registro de falhas)
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logging.error(f"ERRO CRÍTICO NA API: {exc}")
        logging.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": "Erro interno no servidor. Verifique o terminal do Back-end."}
        )

# HTTPS em produção (Requisito 3.1 e 3.2)
@app.middleware("http")
async def enforce_https(request: Request, call_next):
    if settings.ENVIRONMENT == "production":
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        if proto == "http":
            https_url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(https_url), status_code=301)
    return await call_next(request)

# Headers de Segurança
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000 ; includeSubDomains"
    return response

# --- Registro das Rotas (Requisito 6.2) ---

app.include_router(auth.router)           
app.include_router(mfa.router)            
app.include_router(user.router)           
app.include_router(password_reset.router) 

@app.get("/", include_in_schema=False)
async def root():
    return {"message": f"API {settings.PROJECT_NAME} online", "status": "ok"}