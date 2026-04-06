import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["User Profile & LGPD"])

@router.get("/me", response_model=schemas.UserResponse)
#Apenas encaminha o usuário autenticado para o Service. (Requisito 4.8)
def get_me(current_user=Depends(get_current_user)):
    return UserService.get_user_profile(current_user)

@router.get("/export-data")
#Solicita a exportação de dados ao Service. (Requisito 4.9)
def export_user_data(current_user=Depends(get_current_user)):
    return UserService.export_user_data(current_user)

@router.delete("/delete-account", status_code=status.HTTP_200_OK)
#Recebe o comando de exclusão e delega ao Service. (Requisito 4.10)
def delete_account(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return UserService.delete_user_account(db, current_user)