const API_BASE_URL = window.location.origin;
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

// --- SISTEMA DE CONTEÚDO DINÂMICO (IA SIMULADA) ---
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
        const response = await fetch(`${API_BASE_URL}/user/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Sessão inválida");
        
        const user = await response.json();
        const primeironome = user.full_name ? user.full_name.split(" ")[0] : "Usuário";
        
        // Dados Padrão
        document.getElementById("welcomeTitle").textContent = `Bem-vindo(a), ${primeironome}`;
        document.getElementById("dropdownName").textContent = primeironome;
        document.getElementById("dropdownEmail").textContent = user.email;
        avatarBtn.textContent = primeironome.charAt(0).toUpperCase();

        // A Mágica do Conteúdo Dinâmico!
        const especialidade = user.legal_specialty || "Geral";
        document.getElementById("specialtyBadge").textContent = especialidade;
        document.getElementById("dynamicTopic").textContent = especialidade;
        
        if (knowledgeBase[especialidade]) {
            document.getElementById("dynamicContent").textContent = knowledgeBase[especialidade];
        } else {
            document.getElementById("dynamicContent").textContent = "Selecione uma especialidade específica no seu perfil para receber atualizações jurídicas filtradas.";
        }

    } catch (error) {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
}

document.getElementById("menuLogout").addEventListener("click", async (e) => {
    e.preventDefault();
    try { 
        await fetch(`${API_BASE_URL}/auth/logout`, { 
            method: "POST", 
            headers: { "Authorization": `Bearer ${token}` } 
        }); 
    } finally {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
});

// --- O TIMER DE VOLTA À ATIVA ---
const SESSION_LIMIT_MS = 10 * 60 * 1000;
let remainingMs = SESSION_LIMIT_MS;
let countdownTimer;
let inactivityTimer;

function updateTimer() {
    remainingMs -= 1000;
    const min = Math.max(0, Math.floor(remainingMs / 60000));
    const sec = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
    if(timerDisplay) timerDisplay.textContent = `Sessão: ${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function resetSessionTimer() {
    clearTimeout(inactivityTimer);
    clearInterval(countdownTimer);
    remainingMs = SESSION_LIMIT_MS;
    updateTimer();
    countdownTimer = setInterval(updateTimer, 1000);
    inactivityTimer = setTimeout(() => {
        localStorage.removeItem("access_token");
        window.location.href = "login.html?motivo=inatividade";
    }, SESSION_LIMIT_MS);
}

["click", "keydown", "mousemove"].forEach((eventName) => {
    window.addEventListener(eventName, resetSessionTimer, { passive: true });
});

loadBasicProfile();
resetSessionTimer();
