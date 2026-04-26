from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime, timezone
from app.core.db.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # --- DADOS DO ALUNO (Público-Alvo Atualizado) ---
    full_name = Column(String, nullable=True)
    rgm_matriz = Column(String, unique=True, index=True, nullable=True)
    university = Column(String, nullable=True)
    semester = Column(Integer, nullable=True)

    totp_secret = Column(String, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True, onupdate=lambda: datetime.now(timezone.utc))

    # --- PERFIL EDITAVEL DO USUARIO ---
    full_name = Column(String(120), nullable=True)
    profile_type = Column(String(30), nullable=True)  # estudante, advogado ou outro
    university = Column(String(160), nullable=True)
    semester = Column(Integer, nullable=True)
    legal_specialty = Column(String(80), nullable=True)

    # --- NOVOS CAMPOS PARA REQUISITO 1.11 ---
    failed_login_attempts = Column(Integer, default=0)
    lockout_until = Column(DateTime, nullable=True)

    # --- CAMPOS LGPD (Requisitos 4.4 a 4.7) ---
    lgpd_consent = Column(Boolean, default=False) # Req 4.4: Registro explícito
    consent_purpose = Column(String, nullable=True) # Req 4.5: Finalidade associada
    consent_date = Column(DateTime, nullable=True) # Req 4.7: Registro de data
    terms_version = Column(String, default="1.0") # Req 4.7: Registro de versão
