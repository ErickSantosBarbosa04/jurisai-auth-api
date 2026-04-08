window.onload = () => {
    console.log("Página de redefinição carregada com sucesso.");

    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    
    const displayEmail = document.getElementById('userEmail');
    if (email && displayEmail) {
        displayEmail.innerText = email;
    }

    // --- Medidor de Força ---
    const pInput = document.getElementById('newPassword');
    const sBar = document.getElementById('strengthBar');
    const sText = document.getElementById('strengthText');

    if (pInput) {
        pInput.addEventListener('input', () => {
            const senha = pInput.value;
            let forca = 0;
            if (senha.length > 0) {
                forca += 1; 
                if (senha.length >= 3) forca += 1;
                if (senha.length >= 10) forca += 1;
                if (/[A-Z]/.test(senha)) forca += 1;
                if (/[!@#$%^&*]/.test(senha)) forca += 1;
            }
            if (sBar) {
                sBar.className = 'bar';
                if (forca > 0) sBar.classList.add(`lvl-${forca}`);
            }
            if (sText) sText.innerText = `Força: ${forca}/5`;
        });
    }

    // --- VÍNCULO DO BOTÃO ---
    const botao = document.getElementById('btnSalvarSenha');
    if (botao) {
        botao.addEventListener('click', salvarNovaSenha);
        console.log("Botão 'btnSalvarSenha' ativado.");
    } else {
        console.error("ERRO: O botão com ID 'btnSalvarSenha' não foi encontrado!");
    }
};

async function salvarNovaSenha(e) {
    if (e) e.preventDefault();
    console.log("Função salvarNovaSenha disparada!");

    const passwordInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmNewPassword');
    
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    if (!passwordInput || !confirmInput) {
        mostrarAviso("Erro: Campos de senha não localizados.");
        return;
    }

    const newPass = passwordInput.value; 
    const confirmPass = confirmInput.value;

    if (!email) {
        mostrarAviso("Erro: E-mail não identificado.");
        return;
    }

    if (newPass !== confirmPass) {
        mostrarAviso("As senhas não coincidem!");
        return;
    }

    if (newPass.length < 6) {
        mostrarAviso("A senha deve ter no mínimo 6 caracteres.");
        return;
    }

    try {
        console.log("Iniciando envio para o servidor...");
        const response = await fetch('http://127.0.0.1:8000/auth/redefinir-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                new_password: newPass
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Sucesso no servidor! Redirecionando...");
            // Usamos o replace para ele não conseguir "voltar" para a tela de erro
            window.location.replace("login.html");
        } else {
            mostrarAviso(data.detail || "Erro ao redefinir senha.");
        }
    } catch (error) {
        console.error("ERRO NA CHAMADA FETCH:", error);
        mostrarAviso("Não foi possível conectar ao servidor.");
    }
}

function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById('mensagemStatus');
    if (!aviso) {
        alert(msg);
        return;
    }
    aviso.innerText = msg;
    aviso.style.display = "block";
    aviso.style.background = tipo === "success" ? "#d4edda" : "#f8d7da";
    aviso.style.color = tipo === "success" ? "#155724" : "#721c24";
    aviso.style.padding = "10px";
    aviso.style.marginBottom = "15px";
    aviso.style.textAlign = "center";
    aviso.style.borderRadius = "4px";
}