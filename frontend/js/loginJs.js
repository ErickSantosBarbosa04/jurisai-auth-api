// Captura dos elementos do DOM
const loginForm = document.getElementById('loginForm');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');
const toastTimer = document.getElementById('toast-timer');

// Função para exibir a notificação (Toast)
function showToast(message, type = 'error') {
    toastMsg.innerText = message;
    toast.className = type === 'error' ? 'toast-error show' : 'toast-success show';
    
    // Reseta e inicia a animação da barra de progresso
    toastTimer.style.transition = 'none';
    toastTimer.style.width = '100%';
    
    setTimeout(() => {
        toastTimer.style.transition = 'width 3s linear';
        toastTimer.style.width = '0%';
    }, 10);

    // Esconde o toast após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Evento de envio do formulário
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Limpa estados de erro visuais anteriores
    emailInput.classList.remove('input-error');
    passwordInput.classList.remove('input-error');

    // Validação básica de campos vazios (Client-side)
    if (!emailInput.value || !passwordInput.value) {
        if (!emailInput.value) emailInput.classList.add('input-error');
        if (!passwordInput.value) passwordInput.classList.add('input-error');
        
        showToast("Por favor, preencha todos os campos!", "error");
        return;
    }

    try {
        // Faz a requisição para o Back-end FastAPI
        const response = await fetch('http://127.0.0.1:8000/auth/login', {
            method: 'POST', // 'method' deve ser sempre minúsculo no fetch
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value,
                totp_code: null // Enviando null conforme o schema opcional
            })
        });

        const data = await response.json();

        if (response.ok) {
            // SUCESSO: Armazena o token JWT e redireciona
            localStorage.setItem('access_token', data.access_token);
            showToast("Login realizado com sucesso!", "success");
            
            setTimeout(() => { 
                window.location.href = "dashboard.html"; 
            }, 2000);

        } else {
            // ERRO DO SERVIDOR (401, 422, 500, etc.)
            let errorDetail = "Erro ao realizar login";

            // Tratamento específico para o erro 422 do FastAPI (validação)
            if (Array.isArray(data.detail)) {
                errorDetail = data.detail[0].msg;
            } else if (typeof data.detail === 'string') {
                errorDetail = data.detail;
            }

            showToast(errorDetail, "error");
            
            // Destaca o campo de senha se o erro for de credenciais
            if (response.status === 401) {
                passwordInput.classList.add('input-error');
            }
        }
    } catch (error) {
        // Erro de conexão (CORS, Servidor Offline, etc.)
        console.error("Erro na requisição:", error);
        showToast("Não foi possível conectar ao servidor JurisAI.", "error");
    }
});