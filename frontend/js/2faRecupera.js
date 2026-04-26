// js/2faRecupera.js

// CONFIGURAÇÃO: URL do servidor Backend
const API_BASE_URL = "http://127.0.0.1:8000";

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    const email = urlParams.get('email');
    if (email && document.getElementById('displayEmail')) {
        document.getElementById('displayEmail').textContent = email;
    }

    if (urlParams.get('motivo') === 'inatividade') {
        const aviso = document.getElementById('mensagemStatus');
        if (aviso) {
            aviso.innerText = "Notamos falta de interação e desconectamos por segurança.";
            aviso.style.display = "block";
        }
    }

    const inputCode = document.getElementById('totpCode');
    if (inputCode) inputCode.focus();
};

async function validarEVoltar() {
    const codeInput = document.getElementById('totpCode');
    const code = codeInput.value.trim();
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') ? urlParams.get('email').trim() : ''; 

    if (!code || code.length < 6) {
        alert("Por favor, digite o código de 6 dígitos do seu Authenticator.");
        return;
    }

    try {
        console.log(`Enviando validação para ${email}...`);

        // CORREÇÃO: Adicionado o API_BASE_URL para apontar para a porta 8000
        const response = await fetch(`${API_BASE_URL}/auth/recuperar-confirmar`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            },
            body: JSON.stringify({ 
                email: email, 
                code: code 
            })
        });
        
        // Lê a resposta como texto primeiro para evitar erro se não for JSON
        const responseText = await response.text();
        let data = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error("Servidor não retornou JSON válido:", responseText);
        }

        if (response.ok) {
            alert("Sucesso! 2FA validado.");
            // Redireciona para a tela de redefinir a senha passando o email
            window.location.href = `redefinir.html?email=${encodeURIComponent(email)}`;
        } else {
            let mensagemErro = data.detail || "Código incorreto ou expirado.";
            if (typeof mensagemErro !== 'string') mensagemErro = JSON.stringify(mensagemErro);
            alert("Erro: " + mensagemErro);
        }

    } catch (error) {
        console.error("Erro na chamada:", error);
        alert("Não foi possível conectar ao JurisAI na porta 8000.");
    }
}

// Permitir o uso do Enter
const inputCode = document.getElementById('totpCode');
if (inputCode) {
    inputCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') validarEVoltar();
    });
}