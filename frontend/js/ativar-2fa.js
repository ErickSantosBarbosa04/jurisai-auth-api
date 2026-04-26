// js/ativar-2fa.js

let setupCarregado = false;
let currentUserEmail = ""; // Variável vital que agora será preenchida pela rota /me
const API_BASE_URL = "http://127.0.0.1:8000";

function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById("mensagemStatus");
    if (!aviso) return;
    aviso.innerText = msg;
    aviso.style.display = "block";
    
    // Cores baseadas no tipo de mensagem
    if (tipo === "success") {
        aviso.style.color = "#155724";
        aviso.style.background = "#d4edda";
        aviso.style.border = "1px solid #c3e6cb";
    } else {
        aviso.style.color = "#d9534f";
        aviso.style.background = "#f9f2f2";
        aviso.style.border = "1px solid #f5c6cb";
    }
    
    aviso.style.padding = "10px";
    aviso.style.borderRadius = "5px";
    aviso.style.marginBottom = "15px";
}

async function fetchComToken(endpoint, options = {}) {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "register.html";
        throw new Error("Sessão expirada");
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
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
        console.log("1. Buscando dados do usuário na rota /user/me...");
        const meResponse = await fetchComToken("/user/me");
        
        if (meResponse.ok) {
            const me = await meResponse.json();
            currentUserEmail = me.email; // Agora preenchido corretamente!
            console.log("2. E-mail do usuário capturado:", currentUserEmail);
        } else {
            console.error("Erro ao buscar /auth/me. Verifique se a rota existe no Python.");
            throw new Error("Não foi possível identificar seu usuário.");
        }

        console.log("3. Solicitando setup do QR Code...");
        const response = await fetchComToken("/auth/2fa/setup", { method: "POST" });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Erro ao gerar QR Code.");
        }

        const qrcodeContainer = document.getElementById("qrcode");
        if (qrcodeContainer) {
            qrcodeContainer.innerHTML = "";
            new QRCode(qrcodeContainer, {
                text: data.qr_uri,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            console.log("4. QR Code exibido com sucesso!");
        }

    } catch (error) {
        setupCarregado = false;
        console.error("Erro no carregamento:", error);
        mostrarAviso(error.message || "Erro de conexão com o servidor.");
    }
};

async function ativar2FA(event) {
    // 1. Bloqueio absoluto de qualquer evento padrão do navegador
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const codeInput = document.getElementById("totpCode");
    const btn = document.getElementById("btnAtivar");
    
    if (!codeInput || !btn) return;
    
    const code = codeInput.value.trim();

    // Validação básica: garante que são 6 números
    if (code.length !== 6 || isNaN(code)) {
        mostrarAviso("Digite os 6 números exibidos no seu celular.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "Vinculando...";
        
        console.log("5. Enviando verificação de ativação para:", currentUserEmail);

        const response = await fetchComToken("/auth/2fa/verify", {
            method: "POST",
            body: JSON.stringify({
                email: currentUserEmail,
                code: code 
            })
        });
        
        const data = await response.json();

        if (response.ok) {
            console.log("6. 2FA ATIVADO COM SUCESSO!");
            
            // Salva o estado localmente antes de partir
            localStorage.setItem("2fa_enabled", "true");
            
            mostrarAviso("Sucesso! Redirecionando...", "success");

            // Redirecionamento instantâneo com replace para evitar atropelos
            console.log("Encerrando sessão local e voltando para o login.");
            window.location.replace("login.html");
            
            // Retorno falso para garantir que nenhuma bolha de evento suba
            return false;

        } else {
            console.warn("Código rejeitado pelo servidor:", data.detail);
            throw new Error(data.detail || "Código 2FA inválido");
        }

    } catch (error) {
        console.error("Erro na ativação:", error);
        mostrarAviso(error.message, "error");
        
        // Reativa o botão se der erro para o usuário tentar de novo
        btn.disabled = false;
        btn.innerText = "Vincular e Entrar";
    }
    
    return false;
}