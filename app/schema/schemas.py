from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

# --- ENUMS (Sincronizados exatamente com os <option> do seu HTML) ---
ProfileType = Literal["estudante", "advogado", "outro"]

# Removidos acentos onde o HTML não os possui para evitar Erro 400
LegalSpecialty = Literal[
    "Direito Civil",
    "Direito do Trabalho",
    "Direito Penal",
    "Direito Empresarial",
    "Direito Tributario",
    "Direito Constitucional",
    "Direito Administrativo",
    "Direito do Consumidor",
    "Direito de Familia",
    "Direito Previdenciario",
    "Direito Ambiental",
    "Direito Digital",
]

class UserProfileFields(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=3, max_length=120)
    profile_type: Optional[ProfileType] = "estudante"
    university: Optional[str] = Field(default=None, min_length=2, max_length=160)
    semester: Optional[int] = Field(default=None, ge=1, le=12) # Ajustado para até 12 semestres como no seu HTML
    legal_specialty: Optional[LegalSpecialty] = None

    @field_validator("full_name", "university", mode="before")
    @classmethod
    def clean_optional_text(cls, value):
        if value is None:
            return value
        value = str(value).strip()
        return value or None

# --- REQUISIÇÕES ---

class RegisterRequest(BaseModel):
    # No registro, esses campos tornam-se obrigatórios para bater com o banco
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    university: str
    semester: int
    lgpd_consent: bool
    profile_type: ProfileType = "estudante"
    legal_specialty: LegalSpecialty

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None 

# --- RESPOSTAS ---

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int # Alterado para int para bater com o novo models.py dos seus colegas
    email: str
    is_2fa_enabled: bool
    full_name: Optional[str] = None
    profile_type: Optional[str] = None
    university: Optional[str] = None
    semester: Optional[int] = None
    legal_specialty: Optional[str] = None
    lgpd_consent: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# --- SEGURANÇA E MFA ---

class TOTPSetupResponse(BaseModel):
    secret: str
    qr_uri: str

class TOTPVerifyRequest(BaseModel):
    email: str  
    code: str   

# --- ATUALIZAÇÃO E SENHA ---

class UserUpdateRequest(UserProfileFields):
    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "UserUpdateRequest":
        if not self.model_fields_set:
            raise ValueError("Envie pelo menos um campo para atualizar.")
        return self

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ValidarRecuperacaoRequest(BaseModel):
    email: EmailStr
    code: str

class NovaSenhaFinalRequest(BaseModel):
    email: EmailStr
    new_password: str

class RecuperarSenhaRequest(BaseModel):
    email: EmailStr
    code: str 
    new_password: str