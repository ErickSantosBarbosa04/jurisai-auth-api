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

let currentUserData = null; // Armazena os dados originais do usuário

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
    currentUserData = user; // Salva o estado atual do usuário
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

// Função de formatação da instituição
function formatarNomeInstituicao(nome) {
    if (!nome) return "";
    return nome
        .trim()
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
}

// 1. VALIDAÇÃO DE SEGURANÇA: TEXTO SIMPLES (NOME E INSTITUIÇÃO)
function validarTextoSimples(valor, campoNome) {
    const regexValida = /^[a-zA-ZÀ-ÿ\s]+$/;

    if (!valor || valor.trim() === "") {
        return `O campo ${campoNome} não pode ficar vazio.`;
    }

    const valorLimpo = valor.trim();

    if (!regexValida.test(valorLimpo)) {
        return `O campo ${campoNome} não deve conter números ou caracteres especiais.`;
    }

    return null;
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

// Trava de segurança no evento de digitação (Instituição)
const universityInput = document.getElementById("university");
if (universityInput) {
    universityInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    });
}

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullNameInput = document.getElementById("full_name").value;
    const universityInput = document.getElementById("university").value;

    // Validação do Nome
    const erroNome = validarTextoSimples(fullNameInput, "Nome Completo");
    if (erroNome) {
        showToast(erroNome);
        return;
    }

    // Validação da Instituição
    const erroUniv = validarTextoSimples(universityInput, "Instituição");
    if (erroUniv) {
        showToast(erroUniv);
        return;
    }

    saveStatus.textContent = "Salvando...";
    saveStatus.className = "status-pill";

    const formData = new FormData(profileForm);

    // Tratamento seguro da área de interesse
    let selectedSpecialty = formData.get("legal_specialty");
    if (!selectedSpecialty || selectedSpecialty.trim() === "" || selectedSpecialty === "Selecione") {
        selectedSpecialty = currentUserData ? currentUserData.legal_specialty : null;
    }

    // Tratamento seguro do semestre
    let semesterValue = formData.get("semester");
    if (!semesterValue || semesterValue === "") {
        semesterValue = null;
    } else {
        semesterValue = Number(semesterValue);
    }

    const payload = {
        full_name: formData.get("full_name") || null,
        profile_type: formData.get("profile_type") || "estudante",
        university: formatarNomeInstituicao(formData.get("university")) || null,
        semester: semesterValue,
        legal_specialty: selectedSpecialty
    };

    try {
        const response = await fetchProtected("/user/me", {
            method: "PATCH",
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (!response.ok) {
            console.error("Erro de validação (422):", data);
            throw new Error(data.detail || "Erro ao atualizar dados.");
        }

        fillProfile(data);
        showToast("Perfil atualizado com sucesso!");
    } catch (error) {
        saveStatus.textContent = "Erro";
        saveStatus.className = "status-pill warning";
        showToast("Erro ao salvar perfil.");
    }
});

// --- SISTEMA DE SESSÃO SINCRONIZADO ---
const SESSION_LIMIT_MS = 10 * 60 * 1000; // 10 Minutos

function updateTimer() {
    const expiration = parseInt(localStorage.getItem("session_expiration") || Date.now(), 10);
    const remainingMs = Math.max(0, expiration - Date.now());
    
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

// Inicia o cronômetro visual/interno (Apenas uma vez)
setInterval(updateTimer, 1000);

// Adiciona os eventos para detectar que o usuário está ativo (Apenas uma vez)
["click", "keydown", "mousemove"].forEach((eventName) => {
    window.addEventListener(eventName, resetSessionTimer, { passive: true });
});

// Botão de Preferências
document.getElementById("savePreferencesBtn").addEventListener("click", () => {
    const theme = document.getElementById("theme_mode").value;
    const tone = document.getElementById("ai_tone").value;

    localStorage.setItem("theme_mode", theme);
    localStorage.setItem("ai_tone", tone);

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
        const response = await fetchProtected("/auth/logout-all", { method: "POST" });
        if (!response.ok) throw new Error("Erro ao desconectar aparelhos.");
        
        alert("Desconectado com sucesso. Faça login novamente.");
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    } catch (error) {
        showToast("Erro ao processar solicitação.");
    }
});

// Inicializações
loadProfile();
resetSessionTimer();