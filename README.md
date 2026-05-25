# JurisAI

**Plataforma acadêmica para estudantes de Direito**, com foco em alta segurança (MFA/LGPD), gestão administrativa e imersão prática através de um Chat Jurídico com Inteligência Artificial (RAG).

O objetivo do projeto é permitir que o estudante apresente casos concretos e debata com a IA atuando como orientadora, garantindo a proteção total dos dados e o nível de dificuldade adequado ao seu semestre atual.

---
# Acesso ao site
https://jurisai-auth-api-production.up.railway.app/frontend/pages/index.html

---

##  Funcionalidades Principais

###  Segurança, Autenticação e LGPD
- **Cadastro e Login Blindado:** Sessões via JWT (expiração de 30 min) e hash de senhas com `bcrypt`.
- **MFA (Múltiplos Fatores):** Autenticação 2FA TOTP compatível com Google Authenticator.
- **Gestão de Sessão:** Blacklist de tokens no logout e rate limiting (SlowAPI) para evitar ataques de força bruta.
- **Conformidade LGPD:** Ficha de transparência, consentimento explícito, exportação e exclusão permanente de dados (Direito ao Esquecimento).
- **Painel Administrativo:** Dashboard exclusivo para Admins com métricas, logs de auditoria, trava de segurança global (Lockdown) e suspensão de contas.

###  Inteligência Artificial e Estudos
- **Chat Jurídico Autenticado:** Ambiente de simulação, debate e criação de petições.
- **RAG Local Integrado:** Base de dados com arquivos Markdown (`data/legal`) cobrindo as principais áreas do Direito (Civil, Penal, Trabalho, etc.).
- **Escalabilidade de Dificuldade:** A IA adapta a exigência e o vocabulário de acordo com o semestre cadastrado pelo aluno (1º ao 10º).
- **Guardrails de Segurança:** Filtros anti-prompt injection; o sistema se recusa a responder assuntos fora do escopo jurídico.
- **Acessibilidade:** Suporte a entrada e leitura de respostas por voz (TTS).
- **Integração LLM Flexível:** Uso da API Groq (Llama 3) para alta performance, com modo `mock` para desenvolvimento e testes sem custos.

---

##  Stack Tecnológico

| Camada | Tecnologia | Finalidade |
|--------|------------|------------|
| **Backend** | FastAPI | Framework web assíncrono de alta performance |
| **Banco de Dados** | MySQL | Armazenamento relacional robusto |
| **ORM** | SQLAlchemy | Mapeamento de objetos e queries seguras |
| **Segurança** | bcrypt / pyotp | Hash de senhas e geração de tokens 2FA (TOTP) |
| **Sessão** | python-jose | Autenticação via JSON Web Tokens (JWT HS256) |
| **Criptografia** | Fernet | Proteção do segredo 2FA em repouso no banco |
| **IA / LLM** | Groq API (Llama) | Motor de processamento de linguagem natural |
| **Frontend** | HTML/CSS/JS | Interface responsiva com isolamento de privilégios |

---

##  Estrutura Principal do Projeto

```text
JURISAI/
├── app/
│   ├── core/           # Configurações, Segurança, Database e Conexões
│   ├── models/         # Modelos SQLAlchemy (Users, Logs, Tokens)
│   ├── routers/        # Rotas da API (auth.py, chat.py, admin.py, user.py)
│   ├── schema/         # Pydantic Schemas (Validação de entrada/saída)
│   └── services/       # Regras de Negócio (llm_service, auth_service, rag_service)
├── data/
│   └── legal/          # Base de conhecimento Markdown para o RAG
├── frontend/
│   ├── assets/         # Imagens e ícones
│   ├── css/            # Estilizações globais e específicas (Dark Theme)
│   ├── js/             # Lógica client-side e integrações com API
│   └── pages/          # Páginas (login, dashboard, chat, tabelaUser, admin)
├── tests/              # Suíte de testes unitários
├── .env.example        # Modelo de variáveis de ambiente
├── requirements.in     # Lista das bibliotecas principais
└── requirements.txt    # Dependências com assinaturas de segurança (Hashes)
```
---

## Como Executar Localmente
1. Pré-requisitos
Python 3.11+

Banco de Dados MySQL operando localmente ou em nuvem (ex: Railway)

2. Configuração do Ambiente (.env)
Crie um arquivo .env na raiz do projeto com as seguintes variáveis:

---

# Configuração do Ambiente (.env)
Crie um arquivo .env na raiz do projeto com as seguintes variáveis:

ENVIRONMENT=development
ACCESS_TOKEN_EXPIRE_MINUTES=30

Chaves de Segurança (Gere novas chaves para produção!)
Comando para gerar SECRET_KEY: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=sua_secret_key_jwt_aqui

Comando para gerar FERNET_KEY: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FERNET_KEY=sua_fernet_key_aqui

---

# Banco de Dados (Ajuste usuário e senha)
DATABASE_URL=mysql+pymysql://usuario:senha@localhost:3306/jurisai_db

---

# Configurações de IA
LLM_PROVIDER=groq
GROQ_API_KEY=sua_chave_groq_aqui
GROQ_MODEL=llama-3.1-8b-instant

3. Instalação e Execução
Abra o terminal na pasta do projeto e execute:

1. Crie o ambiente virtual
python -m venv venv

2. Ative o ambiente virtual
venv\Scripts\Activate.ps1       # PowerShell (Windows)
 ou: source venv/bin/activate  # Linux/Mac

3. Instale as dependências
pip install -r requirements.txt

4. Inicie o servidor
python -m uvicorn app.main:app --reload

---

## Acessos Locais:

Frontend: Abra os arquivos .html da pasta frontend/pages/ no seu navegador (utilize Live Server se preferir).

Documentação da API (Swagger): http://127.0.0.1:8000/docs

---

## Decisões de Arquitetura e Segurança:
- Criptografia Parametrizada (Argon2/Bcrypt):** Uso de `CryptContext` com *Work Factors* rigorosamente ajustados (controle de custo de tempo, memória e paralelismo) para garantir alta resistência a ataques de força bruta sem causar exaustão de CPU no servidor.
- Proteção contra Força Bruta e DoS (Rate Limiting):** Implementação de "Gateways de Tráfego" via `SlowAPI` limitando acessos por IP nas rotas críticas (Login, Registro e Recuperação de Senha), mitigando ataques de sobrecarga.
- Gestão de Segredos e KMS (Trade-off Arquitetural):** Segregação estrita de variáveis de ambiente (`.env`). Optou-se por não integrar um *Key Management System* (KMS) automatizado de terceiros devido ao escopo do projeto. A rotação de chaves é executada de forma controlada e manual via ambiente de deploy (Railway), garantindo segurança sem inflar custos operacionais.
- Segurança da Cadeia de Suprimentos (Supply Chain):** O arquivo de dependências (`requirements.txt`) é travado via `pip-tools` com *hashes* únicos (SHA-256) para cada biblioteca, blindando o servidor contra a injeção de pacotes maliciosos durante o processo de *build*.
- Observabilidade e Tratamento de Erros:** Exceções não são silenciadas. O sistema utiliza a biblioteca `logging` para registrar anomalias de I/O e segurança de forma oculta, garantindo rastreabilidade para a equipe técnica sem expor detalhes sensíveis na tela do usuário.
- Segregação de Privilégios: Rotas `/admin` possuem verificação estrita de `is_admin=True` decodificada no token e validada no banco de dados, tornando impossível a elevação de privilégios.
- Blacklist Dinâmica (Lockdown):** Ao realizar logout ou acionar o encerramento global de sessões, o token atual é invalidado imediatamente no banco, impedindo a reutilização mesmo que ainda esteja dentro do prazo de 30 minutos.
- Fluxo RAG Seguro:** O modelo LLM não acessa a internet livremente. As respostas são aterradas (*grounded*) estritamente nos arquivos locais em `data/legal`, reduzindo drasticamente a chance de alucinações jurídicas.

---

## IMPORTANTE:
O JurisAI é um projeto acadêmico em constante desenvolvimento.
Importante: As respostas geradas pela Inteligência Artificial não substituem o julgamento técnico de um professor, a atuação de um advogado licenciado, ou a consulta a jurisprudências atualizadas e fontes oficiais. Sempre revise os embasamentos legais gerados.
