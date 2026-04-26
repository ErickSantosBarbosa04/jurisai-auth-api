// Captura dos elementos do DOM
const emailInput = document.getElementById("regEmail");
const passwordInput = document.getElementById("regPassword");
const confirmInput = document.getElementById("confirmPassword");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");

// Lógica de Potência da Senha (Nível 1 a 5)
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const senha = passwordInput.value;
        const emailValue = emailInput.value || "";
        const emailPrefix = emailValue.split('@')[0];
        let forca = 0;

        if (senha.length > 0) {
            forca += 1; 
            if (senha.length >= 3) forca += 1; 
            if (senha.length >= 10) forca += 1; 
            if (/[A-Z]/.test(senha)) forca += 1; 
            if (/[!@#$%^&*(),.?":{}|<>]/.test(senha)) forca += 1; 

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

// Função de Notificação
function mostrarAviso(msg, tipo = "error") {
    let aviso = document.getElementById('mensagemStatus');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'mensagemStatus';
        const card = document.querySelector('.auth-card') || document.querySelector('.login-container');
        card.insertBefore(aviso, card.firstChild.nextSibling);
    }
    
    aviso.innerText = msg;
    aviso.style.display = "block";
    
    if (tipo === "success") {
        aviso.style.background = "#d4edda";
        aviso.style.color = "#155724";
        aviso.style.border = "1px solid #c3e6cb";
    } else {
        aviso.style.background = "#f8d7da";
        aviso.style.color = "#721c24";
        aviso.style.border = "1px solid #f5c6cb";
    }
    aviso.style.padding = "10px";
    aviso.style.borderRadius = "5px";
    aviso.style.marginBottom = "15px";
}

// --- FUNÇÃO PRINCIPAL DE REGISTRO ---
async function realizarRegistro(event) {
    console.log("1. Botão clicado. Iniciando script...");
    
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("2. Refresh padrão bloqueado.");
    }

    const btn = document.getElementById('btnRegistrar');
    
    try {
        const emailField = document.getElementById('regEmail');
        const passwordField = document.getElementById('regPassword');
        const fullNameField = document.getElementById('fullName');
        const universityField = document.getElementById('university');
        const semesterField = document.getElementById('semester');
        const specialtyField = document.getElementById('legalSpecialty');
        const lgpdCheck = document.getElementById('lgpdConsent');

        if (!emailField || !passwordField) {
            console.error("Erro: Campos não encontrados!");
            return false;
        }

        const payload = {
            email: emailField.value.trim().toLowerCase(),
            password: passwordField.value,
            full_name: fullNameField.value.trim(),
            university: universityField.value.trim(),
            semester: Number(semesterField.value) || 1,
            legal_specialty: specialtyField.value || "Direito Civil",
            profile_type: "estudante", 
            lgpd_consent: true
        };

        console.log("3. Enviando fetch...");
        btn.disabled = true;
        btn.innerText = "Processando...";

        const response = await fetch('http://127.0.0.1:8000/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let data = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) { console.error("Erro no parse do JSON"); }

        if (response.ok) {
            console.log("4. Resposta do servidor: 201 OK!");
            
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
            }

            mostrarAviso("Conta criada com sucesso!", "success");
            btn.innerText = "Redirecionando...";

            console.log("6. Redirecionando agora...");
            // Usando location.href para garantir a troca de página imediata
            window.location.href = "telaQr.html"; 
            
            return false; 
        } else {
            console.log("5. Erro retornado pelo servidor.");
            const detail = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
            mostrarAviso(detail || "Erro no cadastro.");
            btn.disabled = false;
            btn.innerText = "Criar conta";
        }

    } catch (error) {
        console.error("ERRO FATAL NO JS:", error); 
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Criar conta";
        }
    }
    
    console.log("7. Fim da execução.");
    return false;
}