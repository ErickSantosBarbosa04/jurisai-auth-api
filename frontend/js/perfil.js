const API_BASE_URL = "http://127.0.0.1:8000";
const token = localStorage.getItem("access_token");

if (!token) window.location.href = "login.html";

// Aplica o tema
function applyTheme() {
    const savedTheme = localStorage.getItem("theme_mode");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
}
applyTheme();

const profileForm = document.getElementById("profileForm");
const saveStatus = document.getElementById("saveStatus");
const toast = document.getElementById("toast");

for (let i = 1; i <= 10; i++) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${i}º semestre`;
    document.getElementById("semester").appendChild(option);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3200);
}

function setField(id, value) {
    const field = document.getElementById(id);
    if (field) field.value = value ?? "";
}

function fillProfile(user) {
    document.getElementById("userEmailCard").textContent = user.email;
    if (user.created_at) {
        document.getElementById("createdAt").textContent = new Intl.DateTimeFormat("pt-BR").format(new Date(user.created_at));
    }

    const twoFactor = document.getElementById("twoFactorStatus");
    twoFactor.textContent = user.is_2fa_enabled ? "2FA Ativo" : "2FA Pendente";
    twoFactor.className = `status-pill ${user.is_2fa_enabled ? "success" : "warning"}`;

    setField("full_name", user.full_name);
    setField("profile_type", user.profile_type || "estudante");
    setField("university", user.university);
    setField("semester", user.semester);
    setField("legal_specialty", user.legal_specialty);

    saveStatus.textContent = "Sincronizado";
    saveStatus.className = "status-pill success";
}

async function fetchProtected(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
        throw new Error("Sessão expirada");
    }
    return response;
}

async function loadProfile() {
    try {
        const response = await fetchProtected("/user/me");
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail);
        fillProfile(data);

        setField("theme_mode", localStorage.getItem("theme_mode") || "light");
        setField("ai_tone", localStorage.getItem("ai_tone") || "tecnico");
    } catch (error) {
        showToast(error.message);
    }
}

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveStatus.textContent = "Salvando...";
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
        const response = await fetchProtected("/user/me", {
            method: "PATCH",
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail);
        fillProfile(data);
        showToast("Perfil atualizado com sucesso!");
    } catch (error) {
        saveStatus.textContent = "Erro";
        saveStatus.className = "status-pill warning";
        showToast("Erro ao salvar perfil.");
    }
});

// --- SISTEMA DE SESSÃO NO PERFIL ---
function resetSessionTimer() {
    localStorage.setItem("session_last_active", Date.now());
}

["click", "keydown", "mousemove"].forEach((eventName) => {
    window.addEventListener(eventName, resetSessionTimer, { passive: true });
});

// Botão de Preferências
document.getElementById("savePreferencesBtn").addEventListener("click", () => {
    const theme = document.getElementById("theme_mode").value;
    const tone = document.getElementById("ai_tone").value;

    localStorage.setItem("theme_mode", theme);
    localStorage.setItem("ai_tone", tone);

    // Atualiza o CSS na hora
    if (theme === "dark") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
    showToast("Preferências do sistema salvas!");
});

// Ações
document.getElementById("exportBtn").addEventListener("click", async () => {
    try {
        const response = await fetchProtected("/user/export-data");
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail);

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "jurisai-dados.json";
        link.click();
    } catch (error) {
        showToast("Erro ao exportar.");
    }
});

document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
    if (!confirm("Atenção: Isso remove sua conta permanentemente!")) return;
    try {
        const response = await fetchProtected("/user/delete-account", { method: "DELETE" });
        if (!response.ok) throw new Error("Erro");
        localStorage.removeItem("access_token");
        window.location.href = "register.html";
    } catch (error) {
        showToast("Erro ao excluir conta.");
    }
});

document.getElementById("logoutAllBtn").addEventListener("click", async () => {
    const confirmed = confirm("Tem certeza que deseja desconectar de todos os outros dispositivos?");
    if (!confirmed) return;

    try {
        const response = await fetchProtected("/user/logout-all", { method: "POST" });
        if (!response.ok) throw new Error("Erro ao desconectar aparelhos.");
        
        alert("Desconectado com sucesso. Faça login novamente.");
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    } catch (error) {
        showToast("Erro ao processar solicitação.");
    }
});

loadProfile();
resetSessionTimer();