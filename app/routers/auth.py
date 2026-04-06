import logging
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
#Delega o registro ao AuthService
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):
    return AuthService.register_user(db, data)

@router.post("/login", response_model=schemas.TokenResponse)
#Delega a autenticação ao AuthService.
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    return AuthService.authenticate_user(db, data)

#--- Implementando token blacklist (Requisito 1.10)
@router.post("/logout")
#Delega a invalidação do token ao AuthService.
def logout(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return AuthService.blacklist_token(db, request, current_user)