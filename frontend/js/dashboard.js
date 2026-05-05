const API_BASE_URL = "http://127.0.0.1:8000";
const token = localStorage.getItem("access_token");
const timerDisplay = document.getElementById("timerDisplay");

// Aplica o tema imediatamente
if (localStorage.getItem("theme_mode") === "dark") {
    document.body.classList.add("dark-mode");
}

if (!token) window.location.href = "login.html";

const avatarBtn = document.getElementById("userAvatarBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

avatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (!dropdownMenu.contains(e.target) && e.target !== avatarBtn) {
        dropdownMenu.classList.add("hidden");
    }
});

const knowledgeBase = {
    "Direito Penal": "O STJ consolidou entendimento recente sobre a aplicação do princípio da insignificância em crimes de furto qualificado. Nossa IA está preparada para redigir Habeas Corpus com base nesta nova tese.",
    "Direito Civil": "Atualizações no Código Civil: Novas diretrizes sobre responsabilidade civil em contratos digitais. Utilize a ferramenta de Petição Inicial para adaptar seus contratos aos novos precedentes.",
    "Direito do Trabalho": "Reforma Trabalhista em foco: O TST emitiu novas súmulas referentes ao regime de teletrabalho e controle de jornada por aplicativos. Explore a nossa base de jurisprudência.",
    "Direito Tributário": "Reforma Tributária: A transição para o novo IVA dual (IBS e CBS) já começou. A JurisAI possui modelos de planejamento fiscal atualizados para o ano corrente.",
    "Direito Empresarial": "A nova lei de Falências e Recuperação Judicial trouxe mudanças rigorosas para o plano de credores. Acesse os resumos de PDFs para analisar balanços de empresas em crise.",
    "Direito Digital": "A LGPD sofreu novas regulamentações da ANPD quanto à coleta de cookies e multas aplicáveis. Nossa IA pode gerar Termos de Uso e Políticas de Privacidade de forma automatizada."
};

async function loadBasicProfile() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/user/me`, {
            headers: { "Authorization": `Bearer ${token}` },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
            localStorage.removeItem("access_token");
            window.location.href = "login.html?motivo=inatividade";
            return;
        }

        if (!response.ok) throw new Error("Sessão inválida");
        
        const user = await response.json();
        const primeironome = user.full_name ? user.full_name.split(" ")[0] : "Usuário";
        
        document.getElementById("welcomeTitle").textContent = `Bem-vindo(a), ${primeironome}`;
        document.getElementById("dropdownName").textContent = primeironome;
        document.getElementById("dropdownEmail").textContent = user.email;
        avatarBtn.textContent = primeironome.charAt(0).toUpperCase();

        const especialidade = user.legal_specialty || "Geral";
        const badge = document.getElementById("specialtyBadge");
        if (badge) badge.textContent = especialidade;
        
        document.getElementById("dynamicTopic").textContent = especialidade;
        
        if (knowledgeBase[especialidade]) {
            document.getElementById("dynamicContent").textContent = knowledgeBase[especialidade];
        } else {
            document.getElementById("dynamicContent").textContent = "Selecione uma especialidade específica no seu perfil para receber atualizações jurídicas filtradas.";
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("Tempo de conexão excedido com a API.");
        }
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
}

async function handleLogout(e) {
    if (e) e.preventDefault();
    try { 
        await fetch(`${API_BASE_URL}/auth/logout`, { 
            method: "POST", 
            headers: { "Authorization": `Bearer ${token}` } 
        }); 
    } finally {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
}

// --- Tratamento seguro dos botões de logout ---
const menuLogoutBtn = document.getElementById("menuLogout");
if (menuLogoutBtn) {
    menuLogoutBtn.addEventListener("click", handleLogout);
}

const navbarLogoutBtn = document.getElementById("navbarLogoutBtn");
if (navbarLogoutBtn) {
    navbarLogoutBtn.addEventListener("click", handleLogout);
}

// --- SISTEMA DE SESSÃO OTIMIZADO E CORRIGIDO ---
const SESSION_LIMIT_MS = 10 * 60 * 1000; // 10 Minutos

// Inicializa a expiração caso não exista
if (!localStorage.getItem("session_expiration")) {
    localStorage.setItem("session_expiration", Date.now() + SESSION_LIMIT_MS);
}

function updateTimer() {
    const expiration = parseInt(localStorage.getItem("session_expiration") || Date.now(), 10);
    const remainingMs = Math.max(0, expiration - Date.now());
    
    const min = Math.floor(remainingMs / 60000);
    const sec = Math.floor((remainingMs % 60000) / 1000);
    
    if (timerDisplay) {
        timerDisplay.textContent = `Sessão: ${min}:${sec < 10 ? "0" : ""}${sec}`;
    }

    // Ao zerar, limpa a sessão e envia para o login
    if (remainingMs <= 0) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("session_expiration");
        window.location.href = "login.html?motivo=inatividade";
    }
}

// Controle para evitar excesso de requisições no localStorage
let lastActivityTime = 0;

function resetSessionTimer() {
    const now = Date.now();
    // Atualiza apenas se o intervalo for maior que 2 segundos
    if (now - lastActivityTime > 2000) {
        lastActivityTime = now;
        localStorage.setItem("session_expiration", now + SESSION_LIMIT_MS);
    }
}

// Escuta os eventos de atividade do usuário
["click", "keydown", "mousemove"].forEach((eventName) => {
    window.addEventListener(eventName, resetSessionTimer, { passive: true });
});

setInterval(updateTimer, 1000);
loadBasicProfile();
resetSessionTimer();