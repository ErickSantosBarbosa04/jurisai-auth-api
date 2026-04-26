let setupCarregado = false;
let currentUserEmail = "";

function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById("mensagemStatus");
    aviso.innerText = msg;
    aviso.style.display = "block";
    aviso.style.color = tipo === "success" ? "#155724" : "#d9534f";
    aviso.style.background = tipo === "success" ? "#d4edda" : "#f9f2f2";
}

async function fetchComToken(url, options = {}) {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "register.html";
        throw new Error("Sessao expirada");
    }

    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
}

window.onload = async () => {
    if (setupCarregado) return;
    setupCarregado = true;

    try {
        const meResponse = await fetchComToken("/auth/me");
        const me = await meResponse.json();
        if (meResponse.ok) {
            currentUserEmail = me.email;
        }

        const response = await fetchComToken("/auth/2fa/setup", { method: "POST" });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Erro ao gerar QR Code.");
        }

        const qrcodeContainer = document.getElementById("qrcode");
        qrcodeContainer.innerHTML = "";

        new QRCode(qrcodeContainer, {
            text: data.qr_uri,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (error) {
        setupCarregado = false;
        mostrarAviso(error.message || "Nao foi possivel conectar ao servidor.");
    }
};

async function ativar2FA() {
    const codeInput = document.getElementById("totpCode");
    const code = codeInput.value.trim();

    if (code.length !== 6) {
        mostrarAviso("Digite o codigo de 6 digitos.");
        return;
    }

    try {
        const response = await fetchComToken("/auth/2fa/verify", {
            method: "POST",
            body: JSON.stringify({
                email: currentUserEmail,
                code
            })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Codigo invalido.");
        }

        mostrarAviso("2FA ativado com sucesso.", "success");
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 900);
    } catch (error) {
        mostrarAviso(error.message || "Nao foi possivel ativar o 2FA.");
    }
}
