1. Reorganização de Pastas (Padrão SoC - Separation of Concerns)
Migramos de um arquivo único (main.py) para uma estrutura modular para facilitar a auditoria e manutenção.

app/core/: Centraliza a inteligência de segurança (security.py), criptografia (crypto.py), configurações (config.py) e conexão com banco (database.py).

app/routers/: Isolamos as rotas por responsabilidade: auth.py, mfa.py, user.py e password_reset.py.

app/models/: Fragmentamos os modelos em arquivos individuais (user_model.py, etc.) seguindo a PEP 8.

app/schema/: Pasta dedicada às validações de entrada e saída (Pydantic).
___________________________________________________________________________________________________________________
2. Centralização de Configurações (core/config.py)
Implementamos a classe Settings para gerenciar chaves sensíveis (SECRET_KEY, FERNET_KEY) vindas do .env.


Garantia: O sistema valida a existência das chaves na inicialização, atendendo ao Requisito 3.6.
___________________________________________________________________________________________________________________
3. Refatoração da Lógica de Segurança (core/security.py)
Isolamos as funções de Hash Bcrypt (Requisitos 1.1 a 1.4).

Configuramos a geração e validação de TOTP (2FA) (Requisitos 1.5 e 1.6).

Gerenciamento de Tokens JWT com tempo de expiração configurável (Requisito 1.9).
___________________________________________________________________________________________________________________
4. Implementação de Criptografia em Repouso (core/crypto.py)
Utilização da biblioteca Fernet (AES-128/256) para cifrar dados sensíveis no banco, como o segredo do 2FA.


Garantia: Atende aos Requisitos 3.4 e 3.5 de dados sensíveis criptografados em repouso.
___________________________________________________________________________________________________________________
5. Blindagem do main.py
O arquivo agora é apenas um "maestro".

Inclusão de Middleware de HTTPS obrigatório para produção (Requisitos 3.1 e 3.2).

Configuração global de Rate Limiting (SlowAPI) para prevenir ataques de força bruta (Requisito 1.11).
___________________________________________________________________________________________________________________
6. Módulo de Conformidade LGPD (routers/user.py)
Criamos rotas específicas para garantir os direitos do titular (Seção 4):

Rota /auth/me: Consulta aos dados (Requisito 4.8).

Rota /auth/export-data: Portabilidade/Exportação (Requisito 4.9).

Rota /auth/delete-account: Direito ao esquecimento/Exclusão (Requisito 4.10).
___________________________________________________________________________________________________________________
7. Gestão de Sessão e Logout (routers/auth.py)
Implementação de Token Blacklist no banco de dados.


Garantia: Ao deslogar, o token é invalidado imediatamente, atendendo ao Requisito 1.10.
___________________________________________________________________________________________________________________
8. Recuperação de Senha Segura (routers/password_reset.py)
Uso de tokens criptograficamente seguros (secrets.token_urlsafe).

Validação de expiração e uso único do token (Requisitos 2.2 a 2.5).___________________________________________________________________________________________________________________