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
    
    if (strengthText) {
        const labels = ["", "Muito Fraca", "Fraca", "Média", "Forte", "Excelente"];
        strengthText.innerText = `Força da senha: ${labels[n]}`;
        strengthText.style.color = n >= 4 ? "var(--success)" : "var(--primary-gold)";
    }
}

function toggleVisibility(inputId, imgId) {
    const input = document.getElementById(inputId);
    const img = document.getElementById(imgId);
    
    if (input.type === "password") {
        input.type = "text";
        img.src = "../assets/olhoAber.png";
    } else {
        input.type = "password";
        img.src = "../assets/olhoOculto.png";
    }
}

function mostrarAviso(msg, tipo = "error") {
    let aviso = document.getElementById('mensagemStatus');
    
    // Se o elemento não existir no HTML, ele será criado agora
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'mensagemStatus';
        const card = document.querySelector('.auth-card');
        // Insere logo abaixo do título
        const titulo = card.querySelector('h2') || card.querySelector('h3');
        titulo.insertAdjacentElement('afterend', aviso);
    }
    
    aviso.innerText = msg;
    aviso.style.display = "block"; // Garante que saia do 'none'
    
    // Aplica as classes que você já tem no seu CSS padronizado
    if (tipo === "success") {
        aviso.className = "toast-success";
        aviso.style.backgroundColor = "rgba(52, 211, 153, 0.1)";
        aviso.style.color = "var(--success)";
        aviso.style.border = "1px solid var(--success)";
    } else {
        aviso.className = "toast-error";
        aviso.style.backgroundColor = "rgba(251, 113, 133, 0.1)";
        aviso.style.color = "var(--error)";
        aviso.style.border = "1px solid var(--error)";
    }

    // Estilos de layout para garantir visibilidade no tema escuro
    aviso.style.padding = "12px";
    aviso.style.margin = "15px 0";
    aviso.style.borderRadius = "6px";
    aviso.style.textAlign = "center";
    aviso.style.fontSize = "0.9rem";
    aviso.style.fontWeight = "500";
}

// --- FUNÇÃO PRINCIPAL DE REGISTRO ---
async function realizarRegistro(event) {
    if (event) event.preventDefault();

    const btn = document.getElementById('btnRegistrar');
    
    // 1. PRIMEIRO: Captura centralizada de todos os campos
    const fields = {
        email: document.getElementById('regEmail'),
        password: document.getElementById('regPassword'),
        confirm: document.getElementById('confirmPassword'),
        fullName: document.getElementById('fullName'),
        university: document.getElementById('university'),
        semester: document.getElementById('semester'),
        specialty: document.getElementById('legalSpecialty'),
        lgpd: document.getElementById('lgpdConsent')
    };

    // 2. Validação: Todos os campos devem estar preenchidos
    const allFilled = Object.values(fields).every(field => {
        if (!field) return false; 
        if (field.type === 'checkbox') return field.checked;
        return field.value.trim() !== "";
    });

    if (!allFilled) {
        mostrarAviso("Por favor, preencha todos os campos e aceite os termos de uso.");
        return false;
    }

    // 3. Validação: Formato de E-mail (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fields.email.value.trim())) {
        mostrarAviso("Por favor, insira um formato de e-mail válido (ex: nome@exemplo.com).");
        return false;
    }

    // 4. Validação: Comparação de senhas
    if (fields.password.value !== fields.confirm.value) {
        mostrarAviso("As senhas não coincidem. Verifique a digitação.");
        return false;
    }

    try {
        const payload = {
            email: fields.email.value.trim().toLowerCase(),
            password: fields.password.value,
            full_name: fields.fullName.value.trim(),
            university: fields.university.value.trim(),
            semester: Number(fields.semester.value),
            legal_specialty: fields.specialty.value,
            profile_type: "estudante", 
            lgpd_consent: true
        };

        btn.disabled = true;
        btn.innerText = "Processando...";

        const response = await fetch('http://127.0.0.1:8000/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            if (data.access_token) localStorage.setItem('access_token', data.access_token);
            
            mostrarAviso("Conta criada com sucesso! Preparando acesso...", "success");
            btn.innerText = "Sucesso!";

            setTimeout(() => { 
                window.location.href = "telaQr.html"; 
            }, 1500);

        } else {
            const detail = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
            mostrarAviso(detail || "Não foi possível completar o cadastro.");
            
            btn.disabled = false;
            btn.innerText = "Criar conta";
        }

    } catch (error) {
        console.error("ERRO DE REDE:", error); 
        mostrarAviso("Falha na comunicação com o servidor. Tente novamente.");
        
        btn.disabled = false;
        btn.innerText = "Criar conta";
    }
    
    return false;
}