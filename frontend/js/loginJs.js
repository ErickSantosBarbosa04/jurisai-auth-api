// js/loginJs.js

// 1. CAPTURA DOS ELEMENTOS
const btnEntrar = document.getElementById('btnEntrar');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');
const toastTimer = document.getElementById('toast-timer');
const togglePassword = document.querySelector('#togglePassword');
const password = document.querySelector('#password');
const eyeIcon = document.querySelector('#eyeIcon');

if (togglePassword) {
    togglePassword.addEventListener('click', function () {
        // Alterna o tipo do input
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        
        // Alterna a imagem da Themis (Venda vs Olhar)
        if (type === 'password') {
            eyeIcon.src = '../assets/olhoOculto.png'; // Com venda
        } else {
            eyeIcon.src = '../assets/olhoAber.png';   // Sem venda
        }
    });
}
function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById('mensagemAviso');
    if (!aviso) return;

    aviso.innerText = msg;
    
    // Aplica a cor baseada no tipo (sucesso ou erro)
    if (tipo === "success") {
        aviso.style.color = "var(--success)";
        aviso.style.borderColor = "var(--success)";
        aviso.style.background = "rgba(52, 211, 153, 0.1)";
    } else {
        aviso.style.color = "var(--error)";
        aviso.style.borderColor = "var(--error)";
        aviso.style.background = "rgba(251, 113, 133, 0.1)";
    }
}
// --- FUNÇÕES DE UTILIDADE (Tentativas e Toast) ---

function obterTentativas() {
    return parseInt(sessionStorage.getItem('tentativas_jurisai') || '0');
}

function salvarTentativas(n) {
    sessionStorage.setItem('tentativas_jurisai', n.toString());
}

function showToast(message, type = 'error') {
    if (!toast || !toastMsg) {
        alert(message); // Fallback caso o HTML do toast suma
        return;
    }

    toastMsg.innerText = message;
    toast.className = type === 'error' ? 'toast-error show' : 'toast-success show';
    
    if (toastTimer) {
        toastTimer.style.transition = 'none';
        toastTimer.style.width = '100%';
        setTimeout(() => {
            toastTimer.style.transition = 'width 3s linear';
            toastTimer.style.width = '0%';
        }, 50);
    }

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- LÓGICA DE BLOQUEIO LOCAL ---

function verificarBloqueioLocal() {
    const btn = document.getElementById('btnEntrar');
    const tempoBloqueio = localStorage.getItem('lockout_time');
    if (tempoBloqueio) {
        const agora = Date.now();
        if (agora < tempoBloqueio) {
            const segundosRestantes = Math.ceil((tempoBloqueio - agora) / 1000);
            iniciarTimerBloqueio(segundosRestantes);
            return true;
        } else {
            localStorage.removeItem('lockout_time');
            salvarTentativas(0);
        }
    }
    return false;
}

function iniciarTimerBloqueio(segundos) {
    const btn = document.getElementById('btnEntrar');
    if (!btn) return;
    btn.disabled = true;

    const intervalo = setInterval(() => {
        segundos--;
        if (segundos <= 0) {
            clearInterval(intervalo);
            btn.disabled = false;
            btn.innerText = "Entrar";
            localStorage.removeItem('lockout_time');
            salvarTentativas(0);
            showToast("Acesso liberado. Tente novamente.", "success");
        } else {
            btn.innerText = `Bloqueado (${segundos}s)`;
        }
    }, 1000);
}

// --- FUNÇÃO SUPREMA DE LOGIN ---

async function realizarLogin() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btn = document.getElementById('btnEntrar');
    const aviso = document.getElementById('mensagemAviso'); // Captura a div correta

    // Limpa avisos anteriores ao clicar
    if (aviso) aviso.innerText = "";

    const emailValue = emailInput.value.trim();
    
    // Validação de E-mail (Frontend)
    if (!emailValue.includes('@')) {
        mostrarAviso("Por favor, insira um e-mail válido com '@'.");
        return; 
    }

    if (!emailInput || !passwordInput || !btn) return;
    if (btn.disabled || verificarBloqueioLocal()) return;

    if (!emailValue || !passwordInput.value) {
        mostrarAviso("Por favor, preencha todos os campos!");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "Verificando...";

        const response = await fetch('http://127.0.0.1:8000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailValue.toLowerCase(),
                password: passwordInput.value,
                totp_code: null 
            })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            salvarTentativas(0);
            localStorage.setItem("access_token", data.access_token);
            mostrarAviso("Login realizado com sucesso! Redirecionando...", "success");
            setTimeout(() => { 
                window.location.replace("duasEtapa.html"); 
            }, 800);
        } else {
            let erros = obterTentativas() + 1;
            salvarTentativas(erros);
            
            const detail = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
            const message = detail || "Erro ao realizar login.";

            // Padronização: Todas as respostas usam mostrarAviso
            if (message.toLowerCase().includes("2fa") || message.toLowerCase().includes("código")) {
                mostrarAviso("Segunda etapa: Autenticação 2FA.", "success");
                setTimeout(() => {
                    window.location.replace(`duasEtapa.html?email=${encodeURIComponent(emailValue.toLowerCase())}`);
                }, 1000);
            } else if (response.status === 403 || erros >= 5) {
                const tempoExpiracao = Date.now() + (60 * 1000);
                localStorage.setItem('lockout_time', tempoExpiracao);
                mostrarAviso(message);
                iniciarTimerBloqueio(60);
            } else {
                // Aqui era onde aparecia o erro na esquerda
                mostrarAviso(`${message} (Tentativa ${erros}/5)`);
                btn.disabled = false;
                btn.innerText = "Entrar";
            }
        }
    } catch (error) {
        mostrarAviso("Não foi possível conectar ao servidor JurisAI.");
        btn.disabled = false;
        btn.innerText = "Entrar";
    }
}

// Atalho Tecla Enter
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const foco = document.activeElement.id;
        if (foco === 'email' || foco === 'password') {
            realizarLogin();
        }
    }
});

// CARREGAMENTO INICIAL
window.onload = () => {
    verificarBloqueioLocal();
};