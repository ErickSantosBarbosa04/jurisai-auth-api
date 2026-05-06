const API_BASE_URL = window.location.origin;

window.onload = () => {
    console.log("Página de redefinição carregada com sucesso.");

    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    
    const displayEmail = document.getElementById('userEmailDisplay');
    if (email && displayEmail) {
        displayEmail.innerText = email;
        // Armazena o e-mail para caso o usuário atualize a tela
        localStorage.setItem('reset_email', email);
    } else if (localStorage.getItem('reset_email')) {
        const storedEmail = localStorage.getItem('reset_email');
        if (displayEmail) displayEmail.innerText = storedEmail;
    }

    // --- Medidor de Força ---
const pInput = document.getElementById('password');
const sBar = document.getElementById('strengthBar');
const sText = document.getElementById('strengthText');

if (pInput) {
    pInput.addEventListener('input', () => {
        const senha = pInput.value;

        // Se o campo estiver vazio, zera o indicador
        if (senha.length === 0) {
            if (sBar) {
                sBar.style.width = '0%';
                sBar.style.backgroundColor = 'transparent';
            }
            if (sText) {
                sText.innerText = 'Força: 0/5';
            }
            return;
        }
        
        let score = 0;
        if (senha.length >= 8) score++;
        if (/\d/.test(senha)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(senha)) score++;
        if (/[A-Z]/.test(senha)) score++;
        if (senha.length >= 12) score++;

        if (sBar) {
            if (score <= 1) {
                sBar.style.width = '20%';
                sBar.style.backgroundColor = 'var(--error)';
            } else if (score === 2 || score === 3) {
                sBar.style.width = '60%';
                sBar.style.backgroundColor = '#f59e0b';
            } else {
                sBar.style.width = '100%';
                sBar.style.backgroundColor = 'var(--success)';
            }
        }
        
        if (sText) {
            sText.innerText = `Força: ${score}/5`;
        }
    });
}

    // --- VÍNCULO DO BOTÃO ---
    const botao = document.getElementById('btnRedefinir');
    if (botao) {
        botao.addEventListener('click', salvarNovaSenha);
        console.log("Botão 'btnRedefinir' ativado.");
    } else {
        console.error("ERRO: O botão com ID 'btnRedefinir' não foi encontrado!");
    }
};

// --- ALTERNÂNCIA DE SENHAS ---
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm_password');
const eyeIcon = document.getElementById('eyeIcon');
const eyeIconConfirm = document.getElementById('eyeIconConfirm');

const togglePassword = document.getElementById('togglePassword');
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        if (eyeIcon) {
            eyeIcon.src = isPassword ? '../assets/olhoaberto.png' : '../assets/olhosfechados.png';
        }
    });
}

const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
if (toggleConfirmPassword) {
    toggleConfirmPassword.addEventListener('click', () => {
        const isPassword = confirmPasswordInput.getAttribute('type') === 'password';
        confirmPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
        if (eyeIconConfirm) {
            eyeIconConfirm.src = isPassword ? '../assets/olhoaberto.png' : '../assets/olhosfechados.png';
        }
    });
}

async function salvarNovaSenha(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    console.log("Função salvarNovaSenha disparada!");

    const pInput = document.getElementById('password');
    const cInput = document.getElementById('confirm_password');
    const btn = document.getElementById('btnRedefinir');
    
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || localStorage.getItem('reset_email');

    if (!pInput || !cInput) {
        mostrarAviso("Erro: Campos de senha não localizados.");
        return false;
    }

    const newPass = pInput.value; 
    const confirmPass = cInput.value;

    if (!email) {
        mostrarAviso("Erro: E-mail não identificado.");
        return false;
    }

    if (newPass !== confirmPass) {
        mostrarAviso("As senhas não coincidem!");
        return false;
    }

    // Regras de validação da senha
    if (newPass.length < 8) {
        mostrarAviso("A senha deve ter no mínimo 8 caracteres.");
        return false;
    }
    if (!/\d/.test(newPass)) {
        mostrarAviso("A senha deve conter pelo menos um número.");
        return false;
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(newPass)) {
        mostrarAviso("A senha deve conter pelo menos um caractere especial (!, @, #, etc).");
        return false;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Salvando...";
        }

        console.log("Iniciando envio para o servidor JurisAI na porta 8000...");
        
        const response = await fetch(`${API_BASE_URL}/auth/redefinir-senha`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                new_password: newPass 
            })
        });

        const responseText = await response.text();
        let data = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (err) {
            console.error("Servidor não retornou JSON:", responseText);
        }

        if (response.ok) {
            console.log("Sucesso no servidor!");
            mostrarAviso("Senha atualizada com sucesso! Redirecionando...", "success");
            
            setTimeout(() => {
                localStorage.removeItem('reset_email');
                window.location.href = "login.html";
            }, 1500);
            
            return false;
        } else {
            let erroMsg = data.detail || "Erro ao redefinir senha.";
            if (typeof erroMsg !== 'string') erroMsg = JSON.stringify(erroMsg);
            mostrarAviso(erroMsg);
            
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Redefinir Senha";
            }
        }
    } catch (error) {
        console.error("ERRO NA CHAMADA FETCH:", error);
        mostrarAviso("Não foi possível conectar ao servidor JurisAI.");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Redefinir Senha";
        }
    }
    return false;
}

function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById('mensagemAviso');
    if (!aviso) {
        alert(msg);
        return;
    }
    
    aviso.innerText = msg;
    aviso.style.display = "block";
    
    if (tipo === "success") {
        aviso.className = "success";
        aviso.style.color = "var(--success)";
        aviso.style.borderColor = "var(--success)";
        aviso.style.background = "rgba(52, 211, 153, 0.1)";
    } else {
        aviso.className = "error";
        aviso.style.color = "var(--error)";
        aviso.style.borderColor = "var(--error)";
        aviso.style.background = "rgba(251, 113, 133, 0.1)";
    }
}
