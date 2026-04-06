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
9. Implementação da Camada de Serviço (app/services/)
Migramos toda a lógica de negócio dos Controllers (Routers) para classes de serviço dedicadas (AuthService, UserService, MFAService, PasswordService).

Padronização: O Router agora apenas recebe a requisição e delega o processamento.

Desacoplamento: A lógica de validação de 2FA, geração de tokens e hashes Bcrypt agora é independente das rotas HTTP.

Garantia: Atende ao Requisito 6.2 (Arquitetura Limpa), facilitando testes unitários e futuras expansões do JurisAI.
___________________________________________________________________________________________________________________
10. Correções de Compatibilidade e Ambiente (Python 3.13)
Ajuste de Hashing: Corrigimos a integração do passlib com o bcrypt para garantir compatibilidade com o Python 3.13, evitando erros de AttributeError.

Tratamento de Timezone: Padronizamos o uso de datetime.now(timezone.utc) em todos os serviços de Token (MFA e Reset), garantindo que a expiração funcione corretamente independente da localização do servidor.
___________________________________________________________________________________________________________________


Porque mudei a estrutura?
    Schema (Pydantic): Limpa e valida o dado na entrada.

    Router (Controller): O "olho" que vê a requisição e valida o acesso.

    Service (Server): O "cérebro" que aplica a regra de negócio e limpa o processo.

    Model/DB: Onde o dado descansa.

Explicando:
    Schema (Pydantic): O Contrato, que limpa e valida a integridade do dado logo na entrada.

    Router (Controller): A Portaria, que gerencia o tráfego e valida as permissões de acesso.

    Service (Business Layer): O Cérebro, que executa a lógica de negócio e orquestra os processos de segurança.

    Model (DB): O Repositório, onde o dado é persistido com integridade.

___________________________________________________________________________________________________________________

Aplicando o Padronização PEP 8
Regaturei seguindo a PEP 8 (Python Enhancement Proposal 8).

O que isso significa? Significa que o código agora segue o padrão internacional de legibilidade do Python. Usamos nomes de funções claros, organização de pastas lógica e espaçamentos padronizados. Isso transforma o código de um "amontoado de linhas" em uma documentação viva, pronta para auditorias técnicas e futuras expansões.