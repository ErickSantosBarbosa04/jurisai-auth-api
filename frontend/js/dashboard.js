const token = localStorage.getItem("access_token");
const profileForm = document.getElementById("profileForm");
const saveStatus = document.getElementById("saveStatus");
const toast = document.getElementById("toast");
const timerDisplay = document.getElementById("timerDisplay");

const specialtyOptions = [
    "Direito Civil",
    "Direito do Trabalho",
    "Direito Penal",
    "Direito Empresarial",
    "Direito Tributario",
    "Direito Constitucional",
    "Direito Administrativo",
    "Direito do Consumidor",
    "Direito de Familia",
    "Direito Previdenciario",
    "Direito Ambiental",
    "Direito Digital"
];

if (!token) {
    window.location.href = "login.html";
}

for (let i = 1; i <= 10; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${i} semestre`;
    document.getElementById("semester").appendChild(option);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3200);
}

function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(value));
}

function setField(id, value) {
    const field = document.getElementById(id);
    if (field) field.value = value ?? "";
}

function fillProfile(user) {
    document.getElementById("welcomeTitle").textContent = user.full_name
        ? `Ola, ${user.full_name.split(" ")[0]}`
        : "Meu perfil";
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("createdAt").textContent = formatDate(user.created_at);
    document.getElementById("updatedAt").textContent = formatDate(user.updated_at);

    const twoFactor = document.getElementById("twoFactorStatus");
    twoFactor.textContent = user.is_2fa_enabled ? "2FA ativo" : "2FA pendente";
    twoFactor.className = `status-pill ${user.is_2fa_enabled ? "success" : "warning"}`;

    setField("full_name", user.full_name);
    setField("profile_type", user.profile_type || "estudante");
    setField("university", user.university);
    setField("semester", user.semester);
    setField("legal_specialty", user.legal_specialty);

    saveStatus.textContent = "Sincronizado";
    saveStatus.className = "status-pill success";
}

async function fetchProtected(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        localStorage.removeItem("access_token");
        window.location.href = "login.html?motivo=inatividade";
        throw new Error("Sessao expirada");
    }

    return response;
}

async function loadProfile() {
    try {
        const response = await fetchProtected("/auth/me");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Nao foi possivel carregar o perfil.");
        }

        fillProfile(data);
    } catch (error) {
        showToast(error.message);
    }
}

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveStatus.textContent = "Salvando";
    saveStatus.className = "status-pill";

    const formData = new FormData(profileForm);
    const payload = {
        full_name: formData.get("full_name") || null,
        profile_type: formData.get("profile_type") || "estudante",
        university: formData.get("university") || null,
        semester: formData.get("semester") ? Number(formData.get("semester")) : null,
        legal_specialty: formData.get("legal_specialty") || null
    };

    try {
        const response = await fetchProtected("/auth/me", {
            method: "PATCH",
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(Array.isArray(data.detail) ? data.detail[0].msg : data.detail);
        }

        fillProfile(data);
        showToast("Perfil atualizado.");
    } catch (error) {
        saveStatus.textContent = "Erro";
        saveStatus.className = "status-pill warning";
        showToast(error.message || "Erro ao salvar perfil.");
    }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        await fetchProtected("/auth/logout", { method: "POST" });
    } finally {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
});

document.getElementById("exportBtn").addEventListener("click", async () => {
    try {
        const response = await fetchProtected("/auth/export-data");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Erro ao exportar dados.");
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "jurisai-dados-usuario.json";
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        showToast(error.message);
    }
});

document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
    const confirmed = confirm("Isso remove sua conta e seus dados. Deseja continuar?");
    if (!confirmed) return;

    try {
        const response = await fetchProtected("/auth/delete-account", { method: "DELETE" });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "Erro ao excluir conta.");
        }
        localStorage.removeItem("access_token");
        window.location.href = "register.html";
    } catch (error) {
        showToast(error.message);
    }
});

const SESSION_LIMIT_MS = 10 * 60 * 1000;
let remainingMs = SESSION_LIMIT_MS;
let countdownTimer;
let inactivityTimer;

function logoutByInactivity() {
    localStorage.removeItem("access_token");
    window.location.href = "login.html?motivo=inatividade";
}

function updateTimer() {
    remainingMs -= 1000;
    const min = Math.max(0, Math.floor(remainingMs / 60000));
    const sec = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
    timerDisplay.textContent = `Sessao: ${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function resetSessionTimer() {
    clearTimeout(inactivityTimer);
    clearInterval(countdownTimer);
    remainingMs = SESSION_LIMIT_MS;
    updateTimer();
    countdownTimer = setInterval(updateTimer, 1000);
    inactivityTimer = setTimeout(logoutByInactivity, SESSION_LIMIT_MS);
}

["click", "keydown", "mousemove"].forEach((eventName) => {
    window.addEventListener(eventName, resetSessionTimer, { passive: true });
});

loadProfile();
resetSessionTimer();
