window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. Exibe o e-mail que veio da tela anterior
    const email = urlParams.get('email');
    if (email) {
        // Usei textContent por segurança contra scripts maliciosos
        document.getElementById('displayEmail').textContent = email;
    }

    // 2. Verifica o status de inatividade (Requisito 1.10)
    if (urlParams.get('motivo') === 'inatividade') {
        const aviso = document.getElementById('mensagemStatus');
        aviso.innerText = "Notamos falta de interação e desconectamos por segurança.";
        aviso.style.display = "block";
    }

    // 3. Auto-focus no campo de código para melhorar a UX
    const inputCode = document.getElementById('totpCode');
    if (inputCode) inputCode.focus();
};

async function validarEVoltar() {
    const codeInput = document.getElementById('totpCode');
    const code = codeInput.value.trim(); // Limpa espaços que o usuário possa digitar sem querer
    const urlParams = new URLSearchParams(window.location.search);
    
    // Pega o e-mail e limpa espaços
    const email = urlParams.get('email') ? urlParams.get('email').trim() : ''; 

    if (!code || code.length < 6) {
        alert("Por favor, digite o código de 6 dígitos do seu Authenticator.");
        return;
    }

    try {
        // ATUALIZAÇÃO: Enviamos tudo no 'body' como um objeto JSON limpo.
        // Isso evita o erro 400 se o servidor estiver esperando um Schema/Modelo específico.
        const response = await fetch(`/auth/recuperar-confirmar`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            },
            // AJUSTE REALIZADO: Mudamos 'token' para 'code' para bater com o schemas.py
            body: JSON.stringify({ 
                email: email, 
                code: code 
            })
        });
        
        const data = await response.json();

        if (response.ok) {
            alert("Sucesso! 2FA validado.");
            window.location.href = `redefinir.html?email=${email}`;
        } else {
            // Se der erro (como o 422 ou 400), tentamos mostrar a mensagem detalhada do Python
            let mensagemErro = "Código incorreto ou expirado.";
            if (data.detail) {
                // Se o detalhe for uma lista (comum no erro 422), pegamos a primeira mensagem
                mensagemErro = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
            }
            alert("Erro: " + mensagemErro);
        }

    } catch (error) {
        console.error("Erro na chamada:", error);
        alert("Não foi possível conectar ao servidor. Verifique se ele está rodando.");
    }
}

// Permitir que o usuário aperte "Enter" para validar
document.getElementById('totpCode').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') validarEVoltar();
});
