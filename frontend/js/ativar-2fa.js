// Variável global para travar múltiplas execuções
let setupCarregado = false;


function irParaLogin() {
    localStorage.removeItem('access_token');
    window.location.href = "login.html";
}

// ADICIONE ESTA LINHA AQUI:
window.irParaLogin = irParaLogin;

window.onload = async () => {
    // Se já carregou uma vez, sai da função imediatamente
    if (setupCarregado) return;
    
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        alert("Sessão expirada. Por favor, cadastre-se novamente.");
        window.location.href = "register.html";
        return;
    }

    // Trava a execução para as próximas chamadas
    setupCarregado = true;

    try {
        const response = await fetch('http://127.0.0.1:8000/auth/2fa/setup', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            }
        });

        const data = await response.json();

        if (response.ok) {
            const qrcodeContainer = document.getElementById("qrcode");
            qrcodeContainer.innerHTML = ""; // Garante que está limpo
            
            new QRCode(qrcodeContainer, {
                text: data.qr_uri,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            
            console.log("QR Code gerado com sucesso!");
        } else {
            // Se deu erro, permitimos tentar de novo resetando a trava
            setupCarregado = false; 
            alert("Erro ao gerar QR Code: " + (data.detail || "Tente novamente."));
        }
    } catch (error) {
        setupCarregado = false;
        console.error("Erro na requisição:", error);
        alert("Não foi possível conectar ao servidor.");
    }
};