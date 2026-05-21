# JurisAI

Plataforma academica para estudantes de Direito, com autenticacao segura, 2FA, LGPD, painel do estudante e chat juridico com IA.

O objetivo do projeto final e permitir que o estudante apresente um caso concreto e debata com a IA em modo orientador/professor, usando uma base juridica local com RAG simples.

## Funcionalidades

- Cadastro e login com JWT.
- 2FA TOTP compativel com Google Authenticator.
- Blacklist de token no logout.
- Logout de todos os dispositivos.
- Perfil academico do estudante.
- Exportacao e exclusao de dados para LGPD.
- Painel do estudante.
- Chat juridico autenticado em `/ai/chat`.
- Modo Debate, Estudo e Peticao.
- Entrada por voz e leitura da resposta no navegador.
- Texto de carregamento "JurisAI esta pensando" enquanto a IA prepara a resposta.
- Guardrails contra prompt injection e perguntas fora do escopo juridico.
- Nivel de dificuldade da IA por semestre: quanto maior o semestre do perfil, mais rigorosa a cobranca no debate.
- RAG simples com arquivos Markdown em `data/legal`, cobrindo temas iniciais de Civil, Consumidor, Trabalho, Penal, Constitucional, Administrativo, Digital, Familia, Previdenciario, Ambiental e Tributario.
- Integracao com Groq opcional; modo `mock` para testes locais sem custo.
- Login com 2FA protegido por desafio temporario de pre-autenticacao.
- Recuperacao de senha protegida por 2FA e token de redefinicao de curta duracao.

## Stack

| Tecnologia | Uso |
| --- | --- |
| FastAPI | Backend e API REST |
| MySQL | Banco de dados |
| SQLAlchemy | ORM |
| bcrypt | Hash de senha |
| python-jose | JWT |
| pyotp | 2FA TOTP |
| Fernet | Criptografia do segredo 2FA |
| HTML/CSS/JS | Frontend simples |
| Groq/Llama | IA opcional via API |

## Estrutura Principal

```txt
app/
  core/
  models/
  routers/
    auth.py
    chat.py
    mfa.py
    user.py
  schema/
    schemas.py
  services/
    llm_service.py
    rag_service.py
data/
  legal/
frontend/
  pages/
    chat.html
    dashboard.html
  js/
    chat.js
```

## Variaveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
ENVIRONMENT=development
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256
SECRET_KEY=troque-por-uma-chave-gerada
FERNET_KEY=troque-por-uma-chave-fernet-gerada
DATABASE_URL=sqlite:///./jurisai_local.db
LLM_PROVIDER=mock
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
```

Para usar Groq:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=sua_chave
```

Sem `GROQ_API_KEY`, o chat funciona em modo demonstracao local.

Para deploy com MySQL/Railway, troque o `DATABASE_URL` para:

```env
DATABASE_URL=mysql+pymysql://usuario:senha@host:3306/jurisai_db
```

## Como Rodar Localmente

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Acesse:

```txt
http://127.0.0.1:8000
http://127.0.0.1:8000/docs
```

## Fluxo da IA

```txt
Estudante envia caso
Guardrail valida prompt injection e escopo juridico
Backend busca fontes em data/legal
RAG monta contexto juridico
LLMService aplica o nivel por semestre e chama Groq ou modo mock
Frontend mostra "JurisAI esta pensando", resposta, fontes e leitura por voz
```

Perguntas fora do juridico, como receita de comida, ou tentativas de comando como
"ignore suas instrucoes", sao recusadas antes de chegar ao modelo.

O semestre pode ser escolhido no cadastro e alterado em `Meu Perfil`. A IA usa esse
campo como nivel academico: 1-2 iniciante, 3-4 basico, 5-6 intermediario, 7-8
avancado e 9-10 profissionalizante.

## Testes

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## Observacao Academica

O JurisAI e uma ferramenta de estudo. As respostas geradas pela IA nao substituem professor, advogado, jurisprudencia atualizada ou fonte oficial.
