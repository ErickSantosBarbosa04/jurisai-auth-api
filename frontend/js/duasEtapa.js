// Pega o e-mail da URL ao carregar para exibir na tela
const urlParams = new URLSearchParams(window.location.search);
const emailDoUrl = urlParams.get('email');
if (emailDoUrl && document.getElementById('userEmail')) {
    document.getElementById('userEmail').innerText = emailDoUrl;
}

// Configuração da URL do Backend
const API_BASE_URL = "http://127.0.0.1:8000";

async function confirmarLogin2FA() {
    const codeInput = document.getElementById('totpCode');
    const btn = document.querySelector('button'); // Pega o botão para feedback visual
    
    // Captura o email novamente para garantir que temos o valor atualizado
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    // 1. Validação básica de interface
    if (!codeInput.value || codeInput.value.length !== 6) {
        mostrarAviso("Digite o código de 6 dígitos.");
        return;
    }

    if (!email) {
        mostrarAviso("Erro: E-mail não identificado na URL.");
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Verificando...";
        }

        console.log("Enviando código para o servidor Python (8000)...");
        
        // CORREÇÃO: URL completa e rota /login-verify (conforme definido no seu Python)
        const response = await fetch(`${API_BASE_URL}/auth/2fa/login-verify`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                code: codeInput.value 
            })
        });

        // 2. Tenta ler a resposta como JSON
        const responseText = await response.text();
        let data = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error("Erro ao processar resposta do servidor:", responseText);
        }

        if (response.ok) {
            console.log("2FA Verificado com sucesso!");
            
            // 3. Salva o token de acesso final para entrar no sistema
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                mostrarAviso("Sucesso! Entrando no JurisAI...", "success");
                
                // Redirecionamento para o Dashboard
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);
            } else {
                mostrarAviso("Erro: Sessão não recebida corretamente.");
                if (btn) btn.disabled = false;
            }
            
        } else {
            // Se o Python retornou erro (400, 401, 422)
            mostrarAviso(data.detail || "Código inválido ou expirado.");
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Confirmar Login";
            }
        }
    } catch (error) {
        console.error("Erro de rede:", error);
        mostrarAviso("Sem conexão com o servidor Python.");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Confirmar Login";
        }
    }
}

function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById('mensagemStatus');
    if (aviso) {
        aviso.innerText = msg;
        aviso.style.display = "block";
        aviso.style.color = tipo === "success" ? "#155724" : "#721c24";
        aviso.style.background = tipo === "success" ? "#d4edda" : "#f8d7da";
        aviso.style.padding = "10px";
        aviso.style.borderRadius = "5px";
        aviso.style.marginTop = "10px";
    } else {
        alert(msg);
    }
}