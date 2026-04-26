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

passwordInput.addEventListener("input", () => {
    const senha = passwordInput.value;
    const emailPrefix = emailInput.value.split("@")[0];
    let forca = 0;

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

    const btn = document.querySelector(".btn-primary");
    const lgpdCheck = document.getElementById("lgpdConsent");

    if (passwordInput.value !== confirmInput.value) {
        mostrarAviso("As senhas nao coincidem.");
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

        const response = await fetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(Array.isArray(data.detail) ? data.detail[0].msg : data.detail);
        }

        localStorage.setItem("access_token", data.access_token);
        window.location.replace("telaQr.html");
    } catch (error) {
        mostrarAviso(error.message || "Erro no cadastro.");
        btn.disabled = false;
        btn.innerText = "Criar conta";
    }

    return false;
}
