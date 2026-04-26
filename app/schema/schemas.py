from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


ProfileType = Literal["estudante", "advogado", "outro"]
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
    profile_type: Optional[ProfileType] = None
    university: Optional[str] = Field(default=None, min_length=2, max_length=160)
    semester: Optional[int] = Field(default=None, ge=1, le=10)
    legal_specialty: Optional[LegalSpecialty] = None

    @field_validator("full_name", "university", mode="before")
    @classmethod
    def clean_optional_text(cls, value):
        if value is None:
            return value
        value = str(value).strip()
        return value or None



class RegisterRequest(UserProfileFields):
    email: EmailStr
    password: str
    lgpd_consent: bool  


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None 

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TOTPSetupResponse(BaseModel):
    secret: str
    qr_uri: str

# Esquema para validar o código de 6 dígitos do Authenticator (Requisito 1.6)
class TOTPVerifyRequest(BaseModel):
    email: str  
    code: str   


class UserUpdateRequest(UserProfileFields):
    @model_validator(mode="after")
    def require_at_least_one_field(self):
        if not self.model_fields_set:
            raise ValueError("Envie pelo menos um campo para atualizar.")
        return self


class UserResponse(BaseModel):
    id: int
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
        
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class NovaSenhaFinalRequest(BaseModel):
    email: EmailStr
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ValidarRecuperacaoRequest(BaseModel):
    email: EmailStr
    code: str
    
# Altere de PasswordResetRequest para RecuperarSenhaRequest
# Esquema para validar a troca de senha (Requisito 1.2)
class RecuperarSenhaRequest(BaseModel):
    email: EmailStr
    code: str # Adicione o campo 'code' se a rota de recuperação exigir o 2FA
    new_password: str
