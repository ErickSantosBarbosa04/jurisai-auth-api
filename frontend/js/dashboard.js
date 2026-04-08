// --- CONFIGURAÇÕES GERAIS ---
const token = localStorage.getItem('access_token');
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');

// Proteção de Rota: Chuta quem não está logado
if (!token) {
    window.location.href = "login.html";
}

// --- GESTÃO DE SESSÃO (Requisitos 1.9 e 1.10) ---
const TEMPO_LIMITE_MS = 2 * 60 * 1000; // 2 Minutos
let tempoRestante = TEMPO_LIMITE_MS;
let countdownTimer;
let inactivityTimer;

function realizarLogoutSilencioso() {
    localStorage.removeItem('access_token');
    // Redireciona com parâmetro para o login mostrar a mensagem de segurança
    window.location.href = "login.html?motivo=inatividade";
}

function atualizarContadorDiscreto() {
    tempoRestante -= 1000;
    
    if (tempoRestante <= 0) {
        clearInterval(countdownTimer);
        realizarLogoutSilencioso();
    }

    const min = Math.floor(tempoRestante / 60000);
    const sec = Math.floor((tempoRestante % 60000) / 1000);
    
    // Log discreto no console a cada 10 segundos
    if (sec % 10 === 0) {
        console.log(`[Segurança] Sessão expira em: ${min}:${sec < 10 ? '0' : ''}${sec}`);
    }
}

function resetarSessao() {
    clearTimeout(inactivityTimer);
    clearInterval(countdownTimer);
    
    tempoRestante = TEMPO_LIMITE_MS;
    
    countdownTimer = setInterval(atualizarContadorDiscreto, 1000);
    inactivityTimer = setTimeout(realizarLogoutSilencioso, TEMPO_LIMITE_MS);
}

// --- INTERAÇÕES DE INTERFACE ---

profileBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Impede o clique de fechar o próprio menu
    profileMenu.classList.toggle('active');
});

// Evento Único de Clique Global
window.onclick = (event) => {
    // 1. Reset da Sessão por clique
    resetarSessao();

    // 2. Fechar menu de perfil se clicar fora
    if (!event.target.matches('#profileBtn')) {
        if (profileMenu.classList.contains('active')) {
            profileMenu.classList.remove('active');
        }
    }
};

// Eventos de atividade
window.onload = resetarSessao;
window.onkeydown = resetarSessao;

// Throttle do mouse para não sobrecarregar o processador
let mouseTimeout;
window.onmousemove = () => {
    if (!mouseTimeout) {
        resetarSessao();
        mouseTimeout = setTimeout(() => { mouseTimeout = null; }, 5000); 
    }
};

// --- FUNÇÕES DE CONFIRMAÇÃO E API ---

function confirmLogout() {
    if (confirm("Mano, tem certeza que deseja sair do JurisAI?")) {
        localStorage.removeItem('access_token');
        window.location.href = "login.html";
    }
}

async function confirmDeleteAccount() {
    const msg = "ATENÇÃO: Isso apagará todos os seus dados permanentemente. Confirma a exclusão?";
    if (confirm(msg)) {
        try {
            const response = await fetch('http://127.0.0.1:8000/auth/delete-account', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert("Conta deletada com sucesso. Sentiremos sua falta!");
                localStorage.removeItem('access_token');
                window.location.href = "register.html";
            } else {
                alert("Erro ao deletar conta. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro na conexão:", error);
        }
    }
}

// Helper para chamadas protegidas (Requisito 1.9)
async function fetchProtegido(url, options = {}) {
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        alert("Sua sessão expirou. Por favor, faça login novamente.");
        localStorage.removeItem('access_token');
        window.location.href = "login.html";
    }

    return response;
}