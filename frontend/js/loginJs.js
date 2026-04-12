// Captura dos elementos do DOM
const loginForm = document.getElementById('loginForm');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');
const toastTimer = document.getElementById('toast-timer');

// Função para exibir a notificação (Toast)
function showToast(message, type = 'error') {
    toastMsg.innerText = message;
    toast.className = type === 'error' ? 'toast-error show' : 'toast-success show';
    
    toastTimer.style.transition = 'none';
    toastTimer.style.width = '100%';
    
    setTimeout(() => {
        toastTimer.style.transition = 'width 3s linear';
        toastTimer.style.width = '0%';
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Evento de envio do formulário
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    emailInput.classList.remove('input-error');
    passwordInput.classList.remove('input-error');

    if (!emailInput.value || !passwordInput.value) {
        if (!emailInput.value) emailInput.classList.add('input-error');
        if (!passwordInput.value) passwordInput.classList.add('input-error');
        showToast("Por favor, preencha todos os campos!", "error");
        return;
    }

    try {
        // Verificar e-mail e senha no FastAPI
        const response = await fetch('http://127.0.0.1:8000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value,
                totp_code: null // No primeiro passo, não enviamos o código ainda
            })
        });

        const data = await response.json();

        if (response.ok) {
            // SUCESSO NA SENHA! 
            // Agora, em vez de ir para o Dashboard, vamos para a verificação de 2FA
            showToast("Senha correta! Verificando segurança...", "success");
            
            setTimeout(() => { 
                // Redireciona para a nova tela de 2FA passando o e-mail
                window.location.href = `duasEtapa.html?email=${encodeURIComponent(emailInput.value)}`; 
            }, 1000);

        } else {
            let errorDetail = "Erro ao realizar login";
            if (Array.isArray(data.detail)) {
                errorDetail = data.detail[0].msg;
            } else if (typeof data.detail === 'string') {
                errorDetail = data.detail;
            }
            showToast(errorDetail, "error");
            
            if (response.status === 401) {
                passwordInput.classList.add('input-error');
            }
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        showToast("Não foi possível conectar ao servidor JurisAI.", "error");
    }
});

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('motivo') === 'inatividade') {
        const aviso = document.getElementById('mensagemAviso'); 
        if(aviso) {
            aviso.innerText = "Notamos falta de interação e desconectamos por segurança.";
            aviso.style.display = "block";
        } else {
            alert("Notamos falta de interação e desconectamos por segurança.");
        }
    }
};