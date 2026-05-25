from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime, timezone
import uuid
from app.core.db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    totp_secret = Column(String(255), nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True, onupdate=lambda: datetime.now(timezone.utc))
    tokens_valid_after = Column(DateTime, nullable=True)

    #  PERFIL EDITAVEL DO USUARIO 
    full_name = Column(String(120), nullable=True)
    profile_type = Column(String(30), nullable=True) 
    university = Column(String(160), nullable=True)
    semester = Column(Integer, nullable=True)
    legal_specialty = Column(String(80), nullable=True)

    #  CONTROLE DE ACESSO 
    is_admin = Column(Boolean, default=False) 

    #  NOVOS CAMPOS PARA REQUISITO 
    last_failed_login = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    lockout_until = Column(DateTime, nullable=True)

    # CAMPOS LGPD 
    lgpd_consent = Column(Boolean, default=False)
    consent_purpose = Column(String(255), nullable=True) 
    consent_date = Column(DateTime, nullable=True)
    terms_version = Column(String(50), default="1.0")
