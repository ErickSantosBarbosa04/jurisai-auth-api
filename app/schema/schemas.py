from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterRequest(BaseModel):
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


class UserResponse(BaseModel):
    id: int
    email: str
    is_2fa_enabled: bool

    class Config:
        from_attributes = True
        
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