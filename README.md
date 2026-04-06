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

jurisai-auth-api/                
├── app/                         
│   ├── core/                    #Camada de Infraestrutura e Segurança
│   │   ├── db/
│   │   │   └── database.py      # Conexão SQLAlchemy e SessionLocal
│   │   ├── config.py            # Validação de Variáveis de Ambiente (.env)
│   │   ├── crypto.py            # Criptografia AES-256 (Fernet) para Repouso
│   │   ├── security.py          # Lógica de JWT, Hash Bcrypt e TOTP
│   │   └── dependencies.py      # Injeção de Dependência (get_db, get_current_user)
│   │
│   ├── models/                  # -Camada de Dados (Entidades do Banco)
│   │   ├── __init__.py          # Exporta os modelos para o SQLAlchemy
│   │   ├── user_model.py        # Tabela de Usuários
│   │   ├── token_blacklist.py   # Tabela para Invalidação de Logout
│   │   └── password_reset.py    # Tabela de Tokens de Recuperação
│   │
│   ├── services/                # -Camada de Serviço (Regras de Negócio/Server)
│   │   ├── user_service.py      # Lógica de LGPD (Exportar, Deletar, Perfil)
│   │   └── auth_service.py      # Lógica de Login, Registro e 2FA
│   │
│   ├── routers/                 # -Camada de Interface (Controllers/Endpoints)
│   │   ├── auth.py              # Rotas de Autenticação
│   │   ├── mfa.py               # Rotas de Segundo Fator
│   │   ├── user.py              # Rotas de Perfil e Conformidade LGPD
│   │   └── password_reset.py    # Rotas de Recuperação de Senha
│   │
│   └── schema/                  # - Camada de Validação (Contratos Pydantic)
│       └── schemas.py           # Definição de entrada/saída de dados
│
├── venv/                        # - Ambiente Virtual (Não vai para o Git)
├── .env                         # - Segredos e Credenciais (DATABASE_URL, etc.)
├── .gitignore                   # - Arquivos ignorados pelo Git
├── main.py                      # - Ponto de Entrada (Inicialização e Middlewares)
└── requirements.txt             # - Lista de Dependências do Projeto

text

---

##  Como Executar

### Pré-requisitos
- Python 3.11+
- PostgreSQL 14+

### Instalação

```cmd
# 1. Acesse a pasta do projeto
cd juris-auth

# 2. Crie o ambiente virtual
python -m venv venv

# 3. Ative o ambiente virtual
venv\Scripts\activate.bat       # CMD Windows
# ou
venv\Scripts\Activate.ps1       # PowerShell

# 4. Instale as dependências
pip install -r requirements.txt

# 5. Execute o servidor
uvicorn app.main:app --reload
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

