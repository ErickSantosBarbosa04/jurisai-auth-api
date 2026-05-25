// ==========================================
// JURISAI - SCRIPT DO PAINEL DE ADMINISTRAÇÃO
// ==========================================

const API_BASE_URL = window.location.origin;
const token = localStorage.getItem("access_token");
const timerDisplay = document.getElementById("timerDisplay");

// --- GARANTIA DE TOKEN ---
if (!token) {
    window.location.href = "login.html?motivo=sem_token";
}

// --- CARREGAR CONTAGEM REAL DE USUÁRIOS ---
async function carregarContagemUsuarios() {
    const contador = document.getElementById('totalUsersCount');
    if (!contador) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users-full`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const usuarios = await response.json();
            contador.innerText = usuarios.length;
        } else if (response.status === 403) {
            // Não é admin → força logout
            localStorage.removeItem("access_token");
            window.location.href = "login.html?motivo=sem_permissao";
        } else {
            contador.innerText = "Erro";
            contador.style.color = "var(--error)";
        }
    } catch (error) {
        console.error("Erro ao buscar total de usuários:", error);
        contador.innerText = "---";
    }
}

document.addEventListener("DOMContentLoaded", carregarContagemUsuarios);

// --- TEMA ---
if (localStorage.getItem("theme_mode") === "dark") {
    document.body.classList.add("dark-mode");
}

// --- MENU SUPERIOR ---
const avatarBtn = document.getElementById("userAvatarBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

avatarBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (!dropdownMenu.contains(e.target) && e.target !== avatarBtn) {
        dropdownMenu.classList.add("hidden");
    }
});

// --- PERFIL ADMIN ---
async function loadAdminProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem("access_token");
            window.location.href = "login.html?motivo=inatividade";
            return;
        }

        if (!response.ok) throw new Error("Sessão inválida");

        const user = await response.json();

        // Checa se é admin (aceita roles OU is_admin)
        const isAdmin = (user.roles && user.roles.includes("admin")) || user.is_admin === true || user.is_admin === 1;

        if (!isAdmin) {
            localStorage.removeItem("access_token");
            window.location.href = "login.html?motivo=sem_permissao";
            return;
        }

        const primeironome = user.full_name ? user.full_name.split(" ")[0] : "Admin";
        document.getElementById("dropdownName").textContent = primeironome;
        document.getElementById("dropdownEmail").textContent = user.email;
        avatarBtn.textContent = primeironome.charAt(0).toUpperCase();

    } catch (error) {
        console.error("Erro ao carregar perfil admin:", error);
        localStorage.removeItem("access_token");
        window.location.href = "login.html?motivo=erro_api";
    }
}


// --- LOGOUT ---
async function handleLogout(e) {
    if (e) e.preventDefault();
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
    } finally {
        localStorage.removeItem("access_token");
        window.location.href = "login.html?motivo=logout";
    }
}

document.getElementById("menuLogout")?.addEventListener("click", handleLogout);

// --- SESSÃO ---
const SESSION_LIMIT_MS = 10 * 60 * 1000; // 10 Minutos

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

// --- INICIALIZAÇÃO ---
setInterval(updateTimer, 1000);
loadAdminProfile();
resetSessionTimer();
