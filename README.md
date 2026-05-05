#  JurisAI Auth API
API de autenticação segura desenvolvida com FastAPI, PostgreSQL e 2FA via TOTP.

---

##  Sobre o Projeto

Sistema de autenticação RESTful que implementa:
- Hash de senhas com **bcrypt** (custo 12)
- Sessões com **JWT** (expiração 30 minutos)
- **Blacklist de tokens** no logout
- **2FA TOTP** compatível com Google Authenticator
- **Rate limiting** 5 tentativas/minuto no login

---
---
juri_db
admin
---
##  Tecnologias

| Tecnologia | Finalidade |
|------------|------------|
| FastAPI | Framework web async |
| PostgreSQL | Banco de dados |
| SQLAlchemy | ORM |
| bcrypt / passlib | Hash de senhas |
| python-jose | JWT HS256 |
| pyotp | 2FA TOTP |
| SlowAPI | Rate limiting |

---

##  Estrutura do Projeto

JURISAI-AUTH-API/
├── app/
│   ├── core/
│   │   ├── db/
│   │   │   └── database.py
│   │   ├── config.py
│   │   ├── crypto.py
│   │   ├── dependencies.py
│   │   └── security.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── PasswordResetToken.py
│   │   ├── TokenBlacklistModel.py
│   │   └── UserModel.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── mfa.py
│   │   ├── password_reset.py
│   │   └── user.py
│   ├── schema/
│   │   └── schemas.py
│   └── services/
│       ├── auth_service.py
│       ├── mfa_service.py
│       ├── password_service.py
│       └── user_service.py
├── frontend/
│   ├── assets/
│   ├── css/
│   │   ├── dashboardStyle.css
│   │   ├── esqueci.css
│   │   ├── loginStyle.css
│   │   ├── recuperar-2fa.css
│   │   └── registrar.css
│   ├── js/
│   │   ├── 2faRecupera.js
│   │   ├── ativar-2fa.js
│   │   ├── authGuard.js
│   │   ├── dashboard.js
│   │   ├── duasEtapa.js
│   │   ├── esqueci.js
│   │   ├── loginJs.js
│   │   ├── perfil.js
│   │   ├── redefinir.js
│   │   └── registrar.js
│   └── pages/
│       ├── dashboard.html
│       ├── duasEtapa.html
│       ├── esqueci.html
│       ├── login.html
│       ├── perfil.html
│       ├── recuperar-2fa.html
│       ├── redefinir.html
│       ├── register.html
│       └── telaQr.html
├── .pytest_cache/
├── .vscode/
├── venv/
├── .env
├── .gitignore
├── banco.txt
├── body.json
├── main.py
├── README.md
├── ReadmeBiel.md
└── requirements.txt

text

---

##  Como Executar

### Pré-requisitos
- Python 3.11+
- PostgreSQL 14+

### Instalação

```cmd
# 1. Criar o .Env na raiz:  (cuiado com a senha do db)
DATABASE_URL="mysql+pymysql://root:sua_senha_aqui@localhost:3306/jurisai_db"
SECRET_KEY=(ele muda)
FERNET_KEY= (ele muda)

# 2. Para descobrir o fernet_key coloque no terminal:

python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Para descobrir o SECRET_KEY coloque no terminal:
python -c "import secrets; print(secrets.token_hex(32))"

# 3. Crie o ambiente virtual
python -m venv venv

# 4. Ative o ambiente virtual
venv\Scripts\activate.bat       # CMD Windows
# ou
venv\Scripts\Activate.ps1       # PowerShell

# 5. Instale as dependências
pip install -r requirements.txt

# 6. Execute o servidor
python -m uvicorn main:app --reload


Acesse
API: http://127.0.0.1:8000

Documentação Swagger: http://127.0.0.1:8000/docs
 Exemplos de Uso
text
# Registro
curl -X POST http://127.0.0.1:8000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"user@email.com\",\"password\":\"Senha@123\"}"

# Login
curl -X POST http://127.0.0.1:8000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"user@email.com\",\"password\":\"Senha@123\"}"

# Setup 2FA
curl -X POST http://127.0.0.1:8000/auth/2fa/setup -H "Authorization: Bearer SEU_TOKEN"

# Verificar 2FA
curl -X POST http://127.0.0.1:8000/auth/2fa/verify -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" -d "{\"code\":\"123456\"}"

# Logout
curl -X POST http://127.0.0.1:8000/auth/logout -H "Authorization: Bearer SEU_TOKEN"
 Decisões de Segurança
bcrypt: Algoritmo lento adaptativo, resistente a brute force, gera salt único automático (OWASP recomendado)

JWT HS256: Stateless, expiração granular de 30 minutos (RFC 7519)

TOTP RFC 6238: Códigos válidos por 30s, compatível com Google Authenticator

Blacklist: Tokens invalidados no logout são rejeitados imediatamente

Rate Limiting: 5 tentativas/min por IP, retorna HTTP 429 ao exceder

