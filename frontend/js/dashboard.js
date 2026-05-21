const API_BASE_URL = window.location.origin;
const token = localStorage.getItem("access_token");
const timerDisplay = document.getElementById("timerDisplay");

if (localStorage.getItem("theme_mode") === "dark") {
    document.body.classList.add("dark-mode");
}

if (!token) {
    window.location.href = "login.html";
}

const avatarBtn = document.getElementById("userAvatarBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

if (avatarBtn && dropdownMenu) {
    avatarBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdownMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
        if (!dropdownMenu.contains(event.target) && event.target !== avatarBtn) {
            dropdownMenu.classList.add("hidden");
        }
    });
}

const knowledgeBase = {
    "Direito do Consumidor": "Sugestao de estudo: apresente um caso de vicio do produto, negativacao indevida ou cobranca abusiva e defenda seu enquadramento juridico no modo Debate.",
    "Direito Civil": "Sugestao de estudo: compare responsabilidade contratual e extracontratual. Use o modo Debate para testar fundamento, dano e nexo causal.",
    "Direito do Trabalho": "Sugestao de estudo: descreva um conflito trabalhista e peca para a IA questionar provas, verbas e tese defensiva.",
    "Direito Penal": "Sugestao de estudo: apresente fatos, tipicidade e tese defensiva. A IA pode simular perguntas de banca.",
    "Direito Empresarial": "Sugestao de estudo: apresente um conflito societario, contrato empresarial ou titulo de credito e teste requisitos, provas e riscos.",
    "Direito Tributario": "Sugestao de estudo: descreva fato gerador, sujeito passivo, tributo e tese. Treine competencia, legalidade e defesa administrativa.",
    "Direito Constitucional": "Sugestao de estudo: formule uma colisao de direitos fundamentais e defenda a ponderacao, proporcionalidade e precedente aplicavel.",
    "Direito Administrativo": "Sugestao de estudo: traga um ato administrativo, licitacao ou responsabilidade do Estado e teste competencia, motivo, finalidade e controle.",
    "Direito de Familia": "Sugestao de estudo: descreva alimentos, guarda, partilha ou uniao estavel e separe fatos, provas e melhor interesse envolvido.",
    "Direito Previdenciario": "Sugestao de estudo: indique beneficio, qualidade de segurado, carencia e provas. A IA pode questionar requisitos e documentos.",
    "Direito Ambiental": "Sugestao de estudo: apresente dano, licenciamento ou responsabilidade ambiental e teste nexo, prova tecnica e reparacao.",
    "Direito Digital": "Sugestao de estudo: use casos de LGPD, privacidade ou contratos digitais para treinar argumentacao.",
    "Geral": "Comece pelo modo Debate. Traga um caso concreto e responda as perguntas da IA como se estivesse em uma atividade orientada."
};

function getAiDifficultyLabel(semester) {
    const value = Number(semester || 1);
    if (value <= 2) return "Nivel IA: iniciante";
    if (value <= 4) return "Nivel IA: basico";
    if (value <= 6) return "Nivel IA: intermediario";
    if (value <= 8) return "Nivel IA: avancado";
    return "Nivel IA: profissionalizante";
}

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

        if (!response.ok) {
            throw new Error("Sessao invalida");
        }

        const user = await response.json();
        const firstName = user.full_name ? user.full_name.split(" ")[0] : "Estudante";

        document.getElementById("welcomeTitle").textContent = `Bem-vindo(a), ${firstName}`;
        document.getElementById("dropdownName").textContent = firstName;
        document.getElementById("dropdownEmail").textContent = user.email;
        avatarBtn.textContent = firstName.charAt(0).toUpperCase();

        const specialty = user.legal_specialty || "Geral";
        const badge = document.getElementById("specialtyBadge");
        if (badge) {
            badge.textContent = specialty;
        }

        const difficultyBadge = document.getElementById("difficultyBadge");
        if (difficultyBadge) {
            difficultyBadge.textContent = getAiDifficultyLabel(user.semester);
        }

        document.getElementById("dynamicTopic").textContent = specialty;
        document.getElementById("dynamicContent").textContent =
            knowledgeBase[specialty] || knowledgeBase.Geral;
    } catch (error) {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
}

async function handleLogout(event) {
    if (event) {
        event.preventDefault();
    }

    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
    } finally {
        localStorage.removeItem("access_token");
        localStorage.removeItem("session_expiration");
        window.location.href = "login.html";
    }
}

const menuLogoutBtn = document.getElementById("menuLogout");
if (menuLogoutBtn) {
    menuLogoutBtn.addEventListener("click", handleLogout);
}

document.querySelectorAll("[data-chat-mode]").forEach((button) => {
    button.addEventListener("click", () => {
        const mode = button.dataset.chatMode || "debate";
        window.location.href = `chat.html?mode=${encodeURIComponent(mode)}`;
    });
});

const SESSION_LIMIT_MS = 30 * 60 * 1000;

if (!localStorage.getItem("session_expiration")) {
    localStorage.setItem("session_expiration", Date.now() + SESSION_LIMIT_MS);
}

function updateTimer() {
    const expiration = parseInt(localStorage.getItem("session_expiration") || Date.now(), 10);
    const remainingMs = Math.max(0, expiration - Date.now());
    const min = Math.floor(remainingMs / 60000);
    const sec = Math.floor((remainingMs % 60000) / 1000);

    if (timerDisplay) {
        timerDisplay.textContent = `Sessao: ${min}:${sec < 10 ? "0" : ""}${sec}`;
    }

    if (remainingMs <= 0) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("session_expiration");
        window.location.href = "login.html?motivo=inatividade";
    }
}

let lastActivityTime = 0;

function resetSessionTimer() {
    const now = Date.now();
    if (now - lastActivityTime > 2000) {
        lastActivityTime = now;
        localStorage.setItem("session_expiration", now + SESSION_LIMIT_MS);
    }
}

["click", "keydown", "mousemove"].forEach((eventName) => {
    window.addEventListener(eventName, resetSessionTimer, { passive: true });
});

setInterval(updateTimer, 1000);
loadBasicProfile();
resetSessionTimer();
