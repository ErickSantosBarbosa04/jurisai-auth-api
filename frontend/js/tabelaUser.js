const API_BASE_URL = window.location.origin;
const token = localStorage.getItem("access_token");

if (!token) window.location.href = "login.html";

// Variável global para guardar os usuários e permitir a pesquisa rápida
let listaDeUsuarios = [];

async function carregarTodosUsuarios() {
    const tableBody = document.getElementById("fullUsersTable");
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Carregando usuários...</td></tr>`;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users-full`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // Se o token for velho ou inválido, desloga na hora!
        if (response.status === 401) {
            console.warn("Token antigo detectado. Redirecionando para login...");
            localStorage.removeItem("access_token");
            window.location.href = "login.html?motivo=sessao_expirada";
            return;
        }

        if (!response.ok) throw new Error("Erro ao buscar lista de usuários.");

        listaDeUsuarios = await response.json();
        aplicarFiltrosEOrdenacao(); 

    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--error);">Erro de conexão ou rota não encontrada.</td></tr>`;
    }
}

// ==========================================
// SISTEMA DE PESQUISA E FILTROS
// ==========================================
const inputBusca = document.getElementById("userSearch");
const selectOrdem = document.getElementById("userSort");

// Fica "escutando" a digitação e a mudança de ordem
inputBusca.addEventListener("input", aplicarFiltrosEOrdenacao);
selectOrdem.addEventListener("change", aplicarFiltrosEOrdenacao);

function aplicarFiltrosEOrdenacao() {
    const termoBusca = inputBusca.value.toLowerCase();
    const ordem = selectOrdem.value;

    // 1. Filtra quem tem o nome ou e-mail parecido com a busca
    let usuariosFiltrados = listaDeUsuarios.filter(user => {
        const nome = (user.full_name || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return nome.includes(termoBusca) || email.includes(termoBusca);
    });

    // 2. Ordena a lista
    if (ordem === "az") {
        usuariosFiltrados.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    } else if (ordem === "za") {
        usuariosFiltrados.sort((a, b) => (b.full_name || "").localeCompare(a.full_name || ""));
    }
    // Se for "recente", deixa como vem do banco (que normalmente já é por ID/Data)

    renderizarTabela(usuariosFiltrados);
}

// ==========================================
// RENDERIZAR TABELA
// ==========================================
// ==========================================
// RENDERIZAR TABELA
// ==========================================
function renderizarTabela(users) {
    const tableBody = document.getElementById("fullUsersTable");
    tableBody.innerHTML = "";

    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum usuário encontrado.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const tr = document.createElement("tr");
        
        // --- LÓGICA DE STATUS CORRIGIDA E MELHORADA ---
        let statusClass = "success";
        let statusText = "Ativo";
        let corBg = "#d4edda"; // Fundo verde clarinho
        let corTexto = "#155724"; // Texto verde escuro

        if (user.lockout_until) {
            const dataBloqueio = new Date(user.lockout_until);
            const agora = new Date();
            
            // Se a data de bloqueio for maior que hoje (Ex: Ano 2999)
            if (dataBloqueio > agora) {
                statusClass = "error";
                statusText = "Suspenso";
                corBg = "#f8d7da"; // Fundo vermelho clarinho
                corTexto = "#721c24"; // Texto vermelho escuro
            }
        }

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600;">${user.full_name || 'Sem nome'}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${user.email}</div>
            </td>
            <td>
                <span class="status-pill ${statusClass}" style="background-color: ${corBg}; color: ${corTexto}; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">
                    ${statusText}
                </span>
            </td>
            <td>${user.profile_type || 'N/A'}</td>
            <td>${user.legal_specialty || 'N/A'}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-action" title="Editar E-mail (Anti-Hacker)" onclick="editarUsuario('${user.id}', '${user.email}')">✏️</button>
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
// FUNÇÕES DE AÇÃO RÁPIDA
// ==========================================

// 1. O LÁPIS (Mudar e-mail à força)
window.editarUsuario = async (id, emailAtual) => {
    // Usamos o prompt nativo para ser rápido e direto
    const novoEmail = prompt(`ALTERAÇÃO DE EMERGÊNCIA:\nDigite o novo e-mail para substituir o atual (${emailAtual}):`, emailAtual);
    
    // Se ele cancelou ou deixou em branco, não faz nada
    if (!novoEmail || novoEmail === emailAtual) return;

    if(confirm(`Tem certeza que deseja mudar o acesso de ${emailAtual} para ${novoEmail}?`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/update-user/${id}`, {
                method: 'PATCH',
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: novoEmail })
            });
            
            const data = await response.json();
            if(response.ok) {
                alert(data.message);
                carregarTodosUsuarios(); // Recarrega a tabela para mostrar o e-mail novo
            } else {
                alert("Erro: " + data.detail);
            }
        } catch (error) {
            alert("Erro de conexão.");
        }
    }
};

// 2. O RESET (Dispara o fluxo do esqueci.html)
window.forçarResetSenha = async (email) => {
    if(confirm(`Enviar e-mail de recuperação com link direto para:\n${email}?`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/force-reset`, {
                method: 'POST',
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: email })
            });
            const data = await response.json();
            
            if(response.ok) {
                alert(data.message + "\n\n(O usuário receberá um botão que o levará para esqueci.html?email=" + email + ")");
            } else {
                alert("Erro: " + data.detail);
            }
        } catch (error) {
            alert("Erro de conexão.");
        }
    }
};

window.alternarStatus = async (id) => {
    if(confirm("Tem certeza que deseja Suspender/Ativar esta conta?")) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/toggle-status/${id}`, {
                method: 'PATCH',
                headers: { "Authorization": `Bearer ${token}` }
            });
            if(response.ok) carregarTodosUsuarios(); 
        } catch (error) {}
    }
};

window.verDetalhesLGPD = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/user-lgpd/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if(response.ok) {
            const dados = await response.json();
            alert("FICHA DE DADOS LGPD:\n\n" + JSON.stringify(dados, null, 4));
        }
    } catch (error) {}
};

window.verLogsUsuario = (id, nome) => {
    const nomeExibicao = nome !== 'null' && nome ? nome : 'Usuário';
    alert(`Abrindo histórico de logs para: ${nomeExibicao}`);
};
carregarTodosUsuarios();