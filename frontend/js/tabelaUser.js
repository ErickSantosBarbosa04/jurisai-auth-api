const API_BASE_URL = window.location.origin;
const token = localStorage.getItem("access_token");

if (!token) window.location.href = "login.html";

async function carregarTodosUsuarios() {
    const tableBody = document.getElementById("fullUsersTable");
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users-full`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Erro ao buscar lista de usuários.");

        const users = await response.json();
        renderizarTabela(users);

    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--error);">Aguardando a criação da rota no backend ou erro de conexão.</td></tr>`;
    }
}

function renderizarTabela(users) {
    const tableBody = document.getElementById("fullUsersTable");
    tableBody.innerHTML = "";

    users.forEach(user => {
        const tr = document.createElement("tr");
        
        // Define se o usuário está bloqueado ou ativo
        const statusClass = user.lockout_until ? "warning" : "success";
        const statusText = user.lockout_until ? "Suspenso" : "Ativo";

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600;">${user.full_name || 'Sem nome'}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${user.email}</div>
            </td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            <td>${user.profile_type || 'N/A'}</td>
            <td>${user.legal_specialty || 'N/A'}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-action" title="Resetar Senha" onclick="forçarResetSenha('${user.email}')">🔑</button>
                    <button class="btn-action" title="Suspender/Ativar" onclick="alternarStatus('${user.id}')">🚫</button>
                    <button class="btn-action" title="Ver Dados LGPD" onclick="verDetalhesLGPD('${user.id}')">📄</button>
                    <button class="btn-action" title="Ver Logs do Usuário" onclick="verLogsUsuario('${user.id}', '${user.full_name}')">📋</button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// ==========================================
// FUNÇÕES DE AÇÃO RÁPIDA (ETAPA 1)
// ==========================================

window.forçarResetSenha = (email) => {
    if(confirm(`Enviar link de recuperação para ${email}?`)) {
        // Aqui chamaremos a rota de recuperação forçada no futuro
        alert("Comando enviado!");
    }
};

window.alternarStatus = (id) => {
    alert("Função de suspensão será conectada à rota /admin/toggle-status");
};

window.verDetalhesLGPD = (id) => {
    alert("Função de dados LGPD em breve.");
};

window.verLogsUsuario = (id, nome) => {
    const nomeExibicao = nome !== 'null' && nome ? nome : 'Usuário';
    alert(`Abrindo histórico de logs de acesso e ações para: ${nomeExibicao}`);
    // No futuro, isso pode abrir um modal ou redirecionar para uma página logsUsuario.html
};

window.carregarTodosUsuarios();