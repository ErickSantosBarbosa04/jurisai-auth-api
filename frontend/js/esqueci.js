// AJUSTE: Transformei em async para permitir o fetch (Requisito 2.1 e 2.7)
async function irPara2FA() {
    const emailInput = document.getElementById('emailRecuperacao');
    const email = emailInput.value.trim();

    // Validação simples de preenchimento
    if (!email) {
        alert("Mano, insira seu e-mail para prosseguir!");
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
        // VERIFICAÇÃO de email (Requisito 2.7) ---
        const response = await fetch(`/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        if (response.ok) {
            // Passa o e-mail para a próxima tela via URL
            // encodeURIComponent garante que símbolos como '@' não quebrem a URL
            window.location.href = `recuperar-2fa.html?email=${encodeURIComponent(email)}`;
        } else {
            // Caso o e-mail não exista ou haja erro, exibe o alerta (Requisito 5.2)
            alert(data.detail || "E-mail não encontrado em nossa base.");
        }

    } catch (error) {
        console.error("Erro na conexão:", error);
        alert("Não foi possível conectar ao JurisAI. Verifique se o servidor está rodando.");
    }
}

// Atalho: apertar Enter no teclado também dispara o botão
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        irPara2FA();
    }
});
