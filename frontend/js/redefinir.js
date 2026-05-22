// =========================================================================
// 1. CONFIGURAÇÕES E INICIALIZAÇÃO
// =========================================================================

const API_BASE_URL = window.location.origin;
let tokenDeRecuperacao = "";

window.onload = () => {
    console.log("Página de redefinição carregada com sucesso.");

    // Captura o TOKEN gigante da URL em vez do e-mail
    const urlParams = new URLSearchParams(window.location.search);
    tokenDeRecuperacao = urlParams.get('token');
    
    // Atualiza a interface visual
    const displayEmail = document.getElementById('userEmailDisplay');
    if (displayEmail) {
        if (tokenDeRecuperacao) {
            displayEmail.innerText = "Conexão Segura Estabelecida";
            displayEmail.style.color = "var(--success)";
        } else {
            displayEmail.innerText = "Aviso: Link inválido ou sem token.";
            displayEmail.style.color = "var(--error)";
            mostrarAviso("Este link de recuperação não é válido ou já expirou.");
        }
    }

    // Ativa o botão de salvar
    const botao = document.getElementById('btnRedefinir');
    if (botao) {
        botao.addEventListener('click', salvarNovaSenha);
    }
};


// =========================================================================
// 2. INTERFACE: MOSTRAR/OCULTAR SENHAS (Olhinhos)
// =========================================================================

const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm_password');
const eyeIcon = document.getElementById('eyeIcon');
const eyeIconConfirm = document.getElementById('eyeIconConfirm');

document.getElementById('togglePassword')?.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    if (eyeIcon) eyeIcon.src = isPassword ? '../assets/olhoaberto.png' : '../assets/olhosfechados.png';
});

document.getElementById('toggleConfirmPassword')?.addEventListener('click', () => {
    const isPassword = confirmPasswordInput.getAttribute('type') === 'password';
    confirmPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
    if (eyeIconConfirm) eyeIconConfirm.src = isPassword ? '../assets/olhoaberto.png' : '../assets/olhosfechados.png';
});


// =========================================================================
// 3. INTERFACE: MEDIDOR DE FORÇA DA SENHA
// =========================================================================

const sBar = document.getElementById('strengthBar');
const sText = document.getElementById('strengthText');

passwordInput?.addEventListener('input', () => {
    const senha = passwordInput.value;

    if (senha.length === 0) {
        if (sBar) { sBar.style.width = '0%'; sBar.style.backgroundColor = 'transparent'; }
        if (sText) sText.innerText = 'Força: 0/5';
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
    
    if (sText) sText.innerText = `Força: ${score}/5`;
});


// =========================================================================
// 4. COMUNICAÇÃO COM O SERVIDOR (Salvar a Senha)
// =========================================================================

async function salvarNovaSenha(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const btn = document.getElementById('btnRedefinir');
    const newPass = passwordInput?.value; 
    const confirmPass = confirmPasswordInput?.value;

    // Validações Iniciais
    mostrarAviso("", "error"); // Limpa avisos anteriores
    document.getElementById('mensagemStatus').style.display = "none";

    if (!tokenDeRecuperacao) {
        mostrarAviso("Erro de segurança: Token ausente. Solicite um novo link.");
        return false;
    }

    if (!newPass || !confirmPass) {
        mostrarAviso("Por favor, preencha as duas senhas.");
        return false;
    }

    if (newPass !== confirmPass) {
        mostrarAviso("As senhas não coincidem!");
        return false;
    }

    // Regras da Senha
    if (newPass.length < 8) return mostrarAviso("A senha deve ter no mínimo 8 caracteres.");
    if (!/\d/.test(newPass)) return mostrarAviso("A senha deve conter pelo menos um número.");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPass)) return mostrarAviso("A senha deve conter um caractere especial (!, @, #, etc).");

    // Enviando para a API
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Salvando...";
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/redefinir-senha`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                token: tokenDeRecuperacao, // Mandamos o Token em vez do e-mail!
                new_password: newPass 
            })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            mostrarAviso("Senha alterada com sucesso! Redirecionando...", "success");
            
            // Joga para o Login após o sucesso
            setTimeout(() => {
                window.location.replace("login.html");
            }, 2000);
            
        } else {
            const erroMsg = data.detail || "Link expirado ou inválido.";
            mostrarAviso(erroMsg);
            
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Redefinir Senha";
            }
        }
    } catch (error) {
        mostrarAviso("Não foi possível conectar ao servidor JurisAI.");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Redefinir Senha";
        }
    }
    return false;
}


// =========================================================================
// 5. FUNÇÕES UTILITÁRIAS
// =========================================================================

function mostrarAviso(msg, tipo = "error") {
    const aviso = document.getElementById('mensagemStatus');
    if (!aviso) {
        if(msg) alert(msg);
        return;
    }
    
    if (!msg) {
        aviso.style.display = "none";
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