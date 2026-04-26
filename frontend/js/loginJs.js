// js/loginJs.js

// 1. CAPTURA DOS ELEMENTOS (Garante que estão acessíveis globalmente no arquivo)
const loginForm = document.getElementById('loginForm');
const btnEntrar = document.getElementById('btnEntrar');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');
const toastTimer = document.getElementById('toast-timer');

// --- CONTROLE DE TENTATIVAS PERSISTENTE ---
function obterTentativas() {
    return parseInt(sessionStorage.getItem('tentativas_jurisai') || '0');
}

function salvarTentativas(n) {
    sessionStorage.setItem('tentativas_jurisai', n.toString());
}

// --- LÓGICA DE NOTIFICAÇÃO (Toast) ---
function showToast(message, type = 'error') {
    if (!toast || !toastMsg || !toastTimer) {
        console.error("ERRO: Elementos do Toast não encontrados no HTML!");
        return;
    }

    console.log(`[TOAST] Exibindo mensagem: ${message}`); // Veja isso no F12

    toastMsg.innerText = message;
    toast.className = type === 'error' ? 'toast-error show' : 'toast-success show';
    
    // Reset da barra de progresso
    toastTimer.style.transition = 'none';
    toastTimer.style.width = '100%';
    
    // Inicia a animação da barra (5 segundos agora)
    setTimeout(() => {
        toastTimer.style.transition = 'width 5s linear';
        toastTimer.style.width = '0%';
    }, 50);

    // Remove o toast após 5 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        console.log("[TOAST] Notificação removida.");
    }, 5000);
}

// --- LÓGICA DE BLOQUEIO LOCAL ---
function verificarBloqueioLocal() {
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
    if (!btnEntrar) return;
    btnEntrar.disabled = true;

    const intervalo = setInterval(() => {
        segundos--;
        if (segundos <= 0) {
            clearInterval(intervalo);
            btnEntrar.disabled = false;
            btnEntrar.innerText = "Entrar no Sistema";
            localStorage.removeItem('lockout_time');
            salvarTentativas(0);
            showToast("Acesso liberado. Tente novamente.", "success");
        } else {
            btnEntrar.innerText = `Bloqueado (${segundos}s)`;
        }
    }, 1000);
}

// --- FUNÇÃO PRINCIPAL DE LOGIN ---
async function realizarLogin() {
    debugger; // O navegador vai PARAR o código aqui quando você clicar
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Valida se os elementos existem e se não está bloqueado
    if (!btnEntrar || btnEntrar.disabled || verificarBloqueioLocal()) return;

    if (!emailInput.value.trim() || !passwordInput.value) {
        showToast("Por favor, preencha todos os campos!", "error");
        return;
    }

    try {
        btnEntrar.disabled = true;
        btnEntrar.innerText = "Verificando...";

        const response = await fetch('http://127.0.0.1:8000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value.trim().toLowerCase(),
                password: passwordInput.value,
                totp_code: null 
            })
        });

        // --- SOLUÇÃO DE FORÇA BRUTA: LER COMO TEXTO PRIMEIRO ---
        const responseText = await response.text();
        let data = {};
        
        try {
            if (responseText) {
                data = JSON.parse(responseText);
            }
        } catch (e) {
            console.warn("O servidor não retornou um JSON válido:", responseText);
        }

        if (response.ok) {
            salvarTentativas(0);
            showToast("Sucesso! Entrando...", "success");
            setTimeout(() => { 
                window.location.replace(`duasEtapa.html?email=${encodeURIComponent(emailInput.value.trim())}`); 
            }, 800);
        } else {
            // ERRO (401, 403, etc)
            let erros = obterTentativas() + 1;
            salvarTentativas(erros);

            const mensagemErro = data.detail || "E-mail ou senha inválidos.";

            if (response.status === 403 || erros >= 5) {
                const tempoExpiracao = Date.now() + (60 * 1000);
                localStorage.setItem('lockout_time', tempoExpiracao);
                showToast(mensagemErro, "error");
                iniciarTimerBloqueio(60);
            } else {
                // AQUI O TOAST PRECISA APARECER
                showToast(`${mensagemErro} Tentativa ${erros}/5`, "error");
                passwordInput.classList.add('input-error');
                
                btnEntrar.disabled = false;
                btnEntrar.innerText = "Entrar no Sistema";
            }
        }

        const detail = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        const message = detail || "Erro ao realizar login.";

        if (message.toLowerCase().includes("2fa")) {
            showToast("Digite o codigo 2FA para continuar.", "success");
            setTimeout(() => {
                window.location.href = `duasEtapa.html?email=${encodeURIComponent(emailInput.value.trim().toLowerCase())}`;
            }, 800);
            return;
        }

        passwordInput.classList.add("input-error");
        showToast(message);
    } catch (error) {
        // ESSE CATCH É A REDE DE SEGURANÇA FINAL
        console.error("Erro fatal capturado:", error);
        showToast("Erro na comunicação com o servidor.", "error");
        btnEntrar.disabled = false;
        btnEntrar.innerText = "Entrar no Sistema";
    }
}

// --- CONFIGURAÇÃO DE EVENTOS ---

// 1. Clique no botão
if (btnEntrar) {
    btnEntrar.onclick = async function(e) {
        // Mata o evento antes mesmo dele começar
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        await realizarLogin();
        return false; // Trava extra
    };
}

// 2. Atalho Tecla Enter
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const foco = document.activeElement.id;
        if (foco === 'email' || foco === 'password') {
            e.preventDefault(); // Impede o "Enter" de dar refresh
            realizarLogin();
        }
    }
});

// --- CARREGAMENTO INICIAL ---
window.onload = () => {
    const agora = Date.now();
    const tempoBloqueio = localStorage.getItem('lockout_time');

    // Se o tempo passou, reseta a memória local de tentativas
    if (tempoBloqueio && agora > tempoBloqueio) {
        localStorage.removeItem('lockout_time');
        sessionStorage.removeItem('tentativas_jurisai');
    }

    verificarBloqueioLocal();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("motivo") === "inatividade") {
        const aviso = document.getElementById("mensagemAviso");
        if (aviso) {
            aviso.innerText = "Sessao encerrada por seguranca.";
            aviso.style.display = "block";
        }
    }
};
