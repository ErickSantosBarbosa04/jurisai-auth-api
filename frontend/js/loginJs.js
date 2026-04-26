const loginForm = document.getElementById("loginForm");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-message");
const toastTimer = document.getElementById("toast-timer");

function showToast(message, type = "error") {
    toastMsg.innerText = message;
    toast.className = type === "error" ? "toast-error show" : "toast-success show";

    toastTimer.style.transition = "none";
    toastTimer.style.width = "100%";

    setTimeout(() => {
        toastTimer.style.transition = "width 3s linear";
        toastTimer.style.width = "0%";
    }, 10);

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    emailInput.classList.remove("input-error");
    passwordInput.classList.remove("input-error");

    if (!emailInput.value || !passwordInput.value) {
        if (!emailInput.value) emailInput.classList.add("input-error");
        if (!passwordInput.value) passwordInput.classList.add("input-error");
        showToast("Preencha e-mail e senha.");
        return;
    }

    try {
        const response = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: emailInput.value.trim().toLowerCase(),
                password: passwordInput.value,
                totp_code: null
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("access_token", data.access_token);
            showToast("Login realizado. Entrando...", "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 800);
            return;
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
        console.error("Erro na requisicao:", error);
        showToast("Nao foi possivel conectar ao servidor JurisAI.");
    }
});

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("motivo") === "inatividade") {
        const aviso = document.getElementById("mensagemAviso");
        if (aviso) {
            aviso.innerText = "Sessao encerrada por seguranca.";
            aviso.style.display = "block";
        }
    }
};
