// Pega o e-mail da URL ao carregar
const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get('email');
if (email) document.getElementById('userEmail').innerText = email;

async function confirmarLogin2FA() {
    const codeInput = document.getElementById('totpCode');
    const msgStatus = document.getElementById('mensagemStatus');
    
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    if (!codeInput.value || codeInput.value.length !== 6) {
        mostrarAviso("Digite o código de 6 dígitos.");
        return;
    }

    try {
        console.log("Enviando código para /auth/2fa/verify...");
        
        // No seu duasEtapa.js, mude a URL para:
        const response = await fetch('http://127.0.0.1:8000/auth/2fa/login-verify', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                code: codeInput.value 
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("2FA Verificado!");
            
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                mostrarAviso("Sucesso! Entrando...", "success");
                
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);
            } else {
                mostrarAviso("Erro: Token não recebido.");
            }
            
        } else {
            // Se o código estiver errado, o Python envia o erro aqui
            mostrarAviso(data.detail || "Código inválido.");
        }
    } catch (error) {
        console.error("Erro no fetch:", error);
        mostrarAviso("Erro de conexão com o servidor.");
    }
}

function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById('mensagemStatus');
    if (aviso) {
        aviso.innerText = msg;
        aviso.style.display = "block";
        aviso.style.color = tipo === "success" ? "#155724" : "#d9534f";
    } else {
        alert(msg);
    }
}