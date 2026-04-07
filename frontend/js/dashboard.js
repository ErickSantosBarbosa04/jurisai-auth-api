const token = localStorage.getItem('access_token');
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');

if (!token) {
    window.location.href = "login.html"; // Chuta quem não está logado
}

profileBtn.addEventListener('click', () => {
    profileMenu.classList.toggle('active');
});

// Fechar se clicar fora da janela
window.onclick = (event) => {
    if (!event.target.matches('#profileBtn')) {
        if (profileMenu.classList.contains('active')) {
            profileMenu.classList.remove('active');
        }
    }
};

// --- FUNÇÕES DE CONFIRMAÇÃO ---

function confirmLogout() {
    const certeza = confirm("Mano, tem certeza que deseja sair do JurisAI?");
    if (certeza) {
        // Aqui você chamaria sua rota /auth/logout se quiser invalidar no banco
        localStorage.removeItem('access_token');
        window.location.href = "login.html";
    }
}

async function confirmDeleteAccount() {
    const msg = "⚠️ ATENÇÃO: Isso apagará todos os seus dados permanentemente. Confirma a exclusão?";
    if (confirm(msg)) {
        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch('http://127.0.0.1:8000/auth/delete-account', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert("Conta deletada com sucesso. Sentiremos sua falta!");
                localStorage.removeItem('access_token');
                window.location.href = "register.html";
            } else {
                alert("Erro ao deletar conta. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro na conexão:", error);
        }
    }
}

// tokens expirados
async function fetchProtegido(url, options = {}) {
    const token = localStorage.getItem('access_token');
    
    // Adiciona o token nos headers automaticamente
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Se o token expirou no Back-end, a gente limpa o Front e desloga
        alert("Sua sessão expirou. Por favor, faça login novamente.");
        localStorage.removeItem('access_token');
        window.location.href = "login.html";
    }

    return response;
}