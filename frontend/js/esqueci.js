// js/esqueci.js

// Definição da URL base do servidor Backend (Python)
const API_BASE_URL = "http://127.0.0.1:8000";

async function irPara2FA() {
    const emailInput = document.getElementById('emailRecuperacao');
    const email = emailInput.value.trim();

    // Validação simples de preenchimento
    if (!email) {
        alert("Insira seu e-mail para prosseguir!");
        emailInput.focus();
        return;
    }

    // Validação básica de formato de e-mail (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Esse e-mail não parece certo. Verifique se digitou corretamente.");
        return;
    }

    try {
        console.log("Iniciando verificação de e-mail para recuperação...");
        
        // AJUSTE: Mudamos para /auth/forgot-password
        // Esta rota usa o EmailRequest (só e-mail), resolvendo o erro 422!
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        // Tenta ler a resposta com segurança
        const responseText = await response.text();
        let data = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error("Erro no parse do JSON:", responseText);
        }

        if (response.ok) {
            console.log("E-mail validado com sucesso! Redirecionando...");
            // Passa o e-mail para a próxima tela via URL para validar o 2FA lá
            window.location.href = `recuperar-2fa.html?email=${encodeURIComponent(email)}`;
        } else {
            // Se o e-mail não existir, o Python retorna 404 e cai aqui
            alert(data.detail || "E-mail não encontrado em nossa base.");
        }

    } catch (error) {
        console.error("Erro na conexão:", error);
        alert("Não foi possível conectar ao JurisAI na porta 8000.");
    }
}

// Atalho: apertar Enter no teclado também dispara o botão
let processando = false;
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !processando) {
        irPara2FA();
    }
});