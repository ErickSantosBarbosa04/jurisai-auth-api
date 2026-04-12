// js/registrar.js

// Seleção dos elementos
const emailInput = document.getElementById('regEmail');
const passwordInput = document.getElementById('regPassword');
const confirmInput = document.getElementById('confirmPassword');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');

// Lógica de Potência da Senha (Nível 1 a 5)
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const senha = passwordInput.value;
        const emailPrefix = emailInput.value.split('@')[0];
        let forca = 0;

        if (senha.length > 0) {
            forca += 1; // +1 caractere (Nível 1)
            if (senha.length >= 3) forca += 1; // 2 para cima (Nível 2)
            if (senha.length >= 10) forca += 1; // Senha comprida (Nível 3)
            if (/[A-Z]/.test(senha)) forca += 1; // Letra Maiúscula (Nível 4)
            if (/[!@#$%^&*(),.?":{}|<>]/.test(senha)) forca += 1; // Especial (Nível 5)

            const sequencias = ['123', 'abc', 'password', 'senha'];
            const temSeq = sequencias.some(s => senha.toLowerCase().includes(s));
            const temEmail = emailPrefix.length > 2 && senha.toLowerCase().includes(emailPrefix.toLowerCase());

            if (temSeq || temEmail) {
                forca = Math.max(1, forca - 1);
            }
        }
        atualizarBarra(forca);
    });
}

function atualizarBarra(n) {
    if (!strengthBar) return;
    strengthBar.className = 'bar'; 
    if (n > 0) strengthBar.classList.add(`lvl-${n}`);
    strengthText.innerText = `Força da senha: ${n}/5`;
}

// Função para exibir aviso no card
function mostrarAviso(msg, tipo = "error") {
    let aviso = document.getElementById('mensagemStatus');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'mensagemStatus';
        const card = document.querySelector('.auth-card');
        card.insertBefore(aviso, card.firstChild.nextSibling);
    }
    
    aviso.innerText = msg;
    aviso.style.display = "block";
    aviso.style.padding = "10px";
    aviso.style.marginBottom = "15px";
    aviso.style.borderRadius = "4px";
    aviso.style.fontSize = "13px";
    aviso.style.textAlign = "center";
    
    if (tipo === "success") {
        aviso.style.background = "#d4edda";
        aviso.style.color = "#155724";
        aviso.style.border = "1px solid #c3e6cb";
    } else {
        aviso.style.background = "#f8d7da";
        aviso.style.color = "#721c24";
        aviso.style.border = "1px solid #f5c6cb";
    }
}

// Função que o botão "Criar conta" chama
async function realizarRegistro(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const btn = document.querySelector('.btn-primary');
    const email = emailInput.value.trim().toLowerCase();
    const pass = passwordInput.value;
    const confirm = confirmInput.value;
    
    // --- VALIDAÇÃO LGPD (Requisito 4.4) ---
    // Busca o checkbox de consentimento.
    const lgpdCheck = document.getElementById('lgpdConsent');
    if (lgpdCheck && !lgpdCheck.checked) {
        mostrarAviso("Você precisa aceitar os termos da LGPD para continuar.");
        return false;
    }

    // --- VALIDAÇÕES ---
    if (pass !== confirm) {
        mostrarAviso("As senhas não coincidem!");
        return false;
    }

    btn.disabled = true;
    btn.innerText = "Processando...";

    try {
        mostrarAviso("Enviando dados para o JurisAI...", "success");

        // AJUSTE: O JSON agora inclui o lgpd_consent para bater com o Schema do Python
        const response = await fetch('http://127.0.0.1:8000/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                password: pass,
                lgpd_consent: true // Enviamos como true para satisfazer o Back-end
            })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
            }
            console.log("Sucesso! Redirecionando para ativação de segurança...");
            window.location.replace("telaQr.html");
            return false;
        } else {
            // Se o erro for 422 aqui, é porque o nome do campo no JSON está diferente do schemas.py
            mostrarAviso(data.detail || "Erro no cadastro.");
            btn.disabled = false;
            btn.innerText = "Criar conta";
        }
    } catch (error) {
        console.error("Erro de rede:", error);
        mostrarAviso("Erro de conexão. O servidor está online?");
        btn.disabled = false;
        btn.innerText = "Criar conta";
    }

    return false;
}

