const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("regEmail");
const universityInput = document.getElementById("university");
const semesterInput = document.getElementById("semester");
const specialtyInput = document.getElementById("legalSpecialty");
const passwordInput = document.getElementById("regPassword");
const confirmInput = document.getElementById("confirmPassword");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");

for (let i = 1; i <= 10; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${i} semestre`;
    semesterInput.appendChild(option);
}

<<<<<<< Updated upstream
passwordInput.addEventListener("input", () => {
    const senha = passwordInput.value;
    const emailPrefix = emailInput.value.split("@")[0];
    let forca = 0;
=======
// Lógica de Potência da Senha (Nível 1 a 5)
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const senha = passwordInput.value;
        const emailValue = emailInput.value || "";
        const emailPrefix = emailValue.split('@')[0];
        let forca = 0;
>>>>>>> Stashed changes

    if (senha.length > 0) {
        forca += 1;
        if (senha.length >= 3) forca += 1;
        if (senha.length >= 10) forca += 1;
        if (/[A-Z]/.test(senha)) forca += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(senha)) forca += 1;

        const sequencias = ["123", "abc", "password", "senha"];
        const temSeq = sequencias.some((item) => senha.toLowerCase().includes(item));
        const temEmail = emailPrefix.length > 2 && senha.toLowerCase().includes(emailPrefix.toLowerCase());

        if (temSeq || temEmail) {
            forca = Math.max(1, forca - 1);
        }
    }

    strengthBar.className = "bar";
    if (forca > 0) strengthBar.classList.add(`lvl-${forca}`);
    strengthText.innerText = `Forca da senha: ${forca}/5`;
});

function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById("mensagemStatus");
    aviso.innerText = msg;
    aviso.className = tipo;
    aviso.style.display = "block";
}

async function realizarRegistro(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

<<<<<<< Updated upstream
    const btn = document.querySelector(".btn-primary");
    const lgpdCheck = document.getElementById("lgpdConsent");

    if (passwordInput.value !== confirmInput.value) {
        mostrarAviso("As senhas nao coincidem.");
=======
    const btn = document.querySelector('.btn-primary');
    
    // Captura dos novos campos acadêmicos
    const fullName = document.getElementById('regFullName').value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const rgm = document.getElementById('regRGM').value.trim();
    const university = document.getElementById('regUniversity').value.trim();
    const semester = parseInt(document.getElementById('regSemester').value);
    const pass = passwordInput.value;
    const confirm = confirmInput.value;
    
    // --- VALIDAÇÃO LGPD (Requisito 4.4) ---
    const lgpdCheck = document.getElementById('lgpdConsent');
    if (lgpdCheck && !lgpdCheck.checked) {
        mostrarAviso("Você precisa aceitar os termos da LGPD para continuar.");
>>>>>>> Stashed changes
        return false;
    }

    if (!lgpdCheck.checked) {
        mostrarAviso("Aceite o termo de consentimento para continuar.");
        return false;
    }

    btn.disabled = true;
    btn.innerText = "Criando...";

    const payload = {
        email: emailInput.value.trim().toLowerCase(),
        password: passwordInput.value,
        lgpd_consent: true,
        full_name: fullNameInput.value.trim(),
        profile_type: "estudante",
        university: universityInput.value.trim(),
        semester: Number(semesterInput.value),
        legal_specialty: specialtyInput.value
    };

    try {
        mostrarAviso("Criando sua conta...", "success");

<<<<<<< Updated upstream
        const response = await fetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
=======
        // AJUSTE: O JSON agora inclui os campos acadêmicos para bater com o Schema do Python
        const response = await fetch('http://127.0.0.1:8000/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                password: pass,
                full_name: fullName,
                rgm_matriz: rgm,
                university: university,
                semester: semester,
                lgpd_consent: true 
            })
>>>>>>> Stashed changes
        });

        const data = await response.json();

<<<<<<< Updated upstream
        if (!response.ok) {
            throw new Error(Array.isArray(data.detail) ? data.detail[0].msg : data.detail);
=======
        if (response.ok) {
            sessionStorage.removeItem('tentativas_jurisai');
            
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
            }
            console.log("Sucesso! Redirecionando para ativação de segurança...");
            window.location.replace("telaQr.html");
            return false;
        } else {
            // Se o erro for 422 aqui, é porque algum campo obrigatório não foi enviado corretamente
            mostrarAviso(data.detail || "Erro no cadastro.");
            btn.disabled = false;
            btn.innerText = "Criar conta";
>>>>>>> Stashed changes
        }

        localStorage.setItem("access_token", data.access_token);
        window.location.replace("telaQr.html");
    } catch (error) {
        mostrarAviso(error.message || "Erro no cadastro.");
        btn.disabled = false;
        btn.innerText = "Criar conta";
    }

    return false;
<<<<<<< Updated upstream
}
=======
}
>>>>>>> Stashed changes
