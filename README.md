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

juris-auth/
├── app/
│ ├── init.py
│ ├── main.py # Rotas FastAPI
│ ├── auth.py # bcrypt + JWT + TOTP
│ ├── database.py # Conexão PostgreSQL
│ ├── models.py # User + TokenBlacklist
│ ├── schemas.py # Validação Pydantic
│ └── dependencies.py # get_db, get_current_user
├── requirements.txt
├── README.md
└── venv/

text

---

##  Como Executar

### Pré-requisitos
- Python 3.11+
- PostgreSQL 14+

### Instalação

```cmd
# 1. Criar o .Env na raiz:
DATABASE_URL=sqlite:///./jurisai.db
SECRET_KEY=9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p
FERNET_KEY= (ele muda)

# 2. Para descobrir o fernet_key coloque no terminal:

python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 3. Acesse a pasta do projeto
cd juris-auth

# 4. Crie o ambiente virtual
python -m venv venv

# 5. Ative o ambiente virtual
venv\Scripts\activate.bat       # CMD Windows
# ou
venv\Scripts\Activate.ps1       # PowerShell

# 6. Instale as dependências
pip install -r requirements.txt

# 7. Execute o servidor
uvicorn main:app --reload
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

