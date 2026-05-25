import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.db.database import get_db
from app.core.dependencies import get_current_user
from app.schema import schemas
from app.services.user_service import UserService
from app.models.UserModel import User 

# O prefixo aqui é /user, então o endpoint completo será /user/me
router = APIRouter(prefix="/user", tags=["User Profile & LGPD"])

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=schemas.UserResponse)
def update_me(
    data: schemas.UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return UserService.update_user_profile(db, current_user, data)

@router.get("/export-data")
def export_user_data(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return UserService.export_user_data(db, current_user)

@router.delete("/delete-account", status_code=status.HTTP_200_OK)
def delete_account(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return UserService.delete_user_account(db, current_user)

