// =========================================================================
// 1. CONFIGURAÇÕES E MEMÓRIA (O "Cérebro" da página)
// =========================================================================

const API_BASE_URL = window.location.origin;
const token = localStorage.getItem("access_token");

// Se não tiver crachá, expulsa para o login
if (!token) window.location.href = "login.html";

// Guardamos os usuários aqui para não precisar pedir ao servidor toda hora
let listaDeUsuarios = []; 
let usuariosFiltradosGlobais = []; 

// Controle de quantas pessoas aparecem por vez na tela
let paginaAtual = 1;
const itensPorPagina = 10;

// Aplica o tema imediatamente ao abrir a página (Força Máxima)
document.addEventListener("DOMContentLoaded", () => {
    const temaSalvo = localStorage.getItem('theme') || 'light';
    
    if (temaSalvo === 'dark') {
        document.body.classList.add('dark-theme');
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        document.documentElement.setAttribute('data-theme', 'light');
    }
});

// =========================================================================
// 2. INICIALIZAÇÃO E EVENTOS (Os "Ouvidos" da página)
// =========================================================================

document.getElementById("userSearch")?.addEventListener("input", aplicarFiltrosEOrdenacao);
document.getElementById("userSort")?.addEventListener("change", aplicarFiltrosEOrdenacao);
document.getElementById("btnPrevPage")?.addEventListener("click", () => mudarPagina('prev'));
document.getElementById("btnNextPage")?.addEventListener("click", () => mudarPagina('next'));

carregarTodosUsuarios();

// =========================================================================
// 3. COMUNICAÇÃO COM O SERVIDOR (Busca de Dados)
// =========================================================================

async function carregarTodosUsuarios() {
    const tableBody = document.getElementById("fullUsersTable");
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Carregando usuários...</td></tr>`;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users-full`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.status === 401) {
            console.warn("Sessão antiga. Redirecionando para login...");
            localStorage.removeItem("access_token");
            window.location.href = "login.html?motivo=sessao_expirada";
            return;
        }

        if (!response.ok) throw new Error("Erro ao buscar a lista no banco de dados.");

        listaDeUsuarios = await response.json();
        aplicarFiltrosEOrdenacao(); 

    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--error);">Erro de conexão. Tente atualizar a página.</td></tr>`;
    }
}

// =========================================================================
// 4. ORGANIZAÇÃO DOS DADOS (Pesquisa e Matemática das Páginas)
// =========================================================================

function aplicarFiltrosEOrdenacao() {
    const termoBusca = document.getElementById("userSearch")?.value.toLowerCase() || "";
    const ordem = document.getElementById("userSort")?.value || "recente";

    usuariosFiltradosGlobais = listaDeUsuarios.filter(user => {
        const nome = (user.full_name || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return nome.includes(termoBusca) || email.includes(termoBusca);
    });

    if (ordem === "az") {
        usuariosFiltradosGlobais.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    } else if (ordem === "za") {
        usuariosFiltradosGlobais.sort((a, b) => (b.full_name || "").localeCompare(a.full_name || ""));
    }

    paginaAtual = 1;
    renderizarTabela();
}

window.mudarPagina = (direcao) => {
    const totalPaginas = Math.ceil(usuariosFiltradosGlobais.length / itensPorPagina);
    
    if (direcao === 'next' && paginaAtual < totalPaginas) {
        paginaAtual++;
    } else if (direcao === 'prev' && paginaAtual > 1) {
        paginaAtual--;
    }
    
    renderizarTabela();
};

// =========================================================================
// 5. DESENHANDO NA TELA (A Criação Visual da Tabela)
// =========================================================================

function renderizarTabela() {
    const tableBody = document.getElementById("fullUsersTable");
    tableBody.innerHTML = ""; 

    if (usuariosFiltradosGlobais.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum usuário encontrado.</td></tr>`;
        atualizarControlesPaginacao();
        return;
    }

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const usuariosDaPagina = usuariosFiltradosGlobais.slice(inicio, fim);

    usuariosDaPagina.forEach(user => {
        const tr = document.createElement("tr");
        
        let statusClass = "success";
        let statusText = "Ativo";
        let corBg = "#d4edda"; 
        let corTexto = "#155724"; 

        if (user.lockout_until) {
            const dataBloqueio = new Date(user.lockout_until);
            if (dataBloqueio > new Date()) {
                statusClass = "error";
                statusText = "Suspenso";
                corBg = "#f8d7da"; 
                corTexto = "#721c24"; 
            }
        }

        // --- VERIFICAÇÃO DE ADMINISTRAÇÃO BLINDADA ---
        // Checa todas as possibilidades que o banco pode estar enviando
        let ehAdmin = (
            user.is_admin == 1 || 
            user.is_admin === "1" || 
            user.is_admin === true || 
            String(user.is_admin).toLowerCase() === "true" ||
            user.admin == 1 // Caso a coluna se chame apenas 'admin'
        );
        
        let perfilExibicao = user.profile_type || 'N/A';
        
        // Se for admin, o texto na tabela muda para dourado
        if (ehAdmin) {
            perfilExibicao = '<span style="color: var(--primary-gold); font-weight: bold;">Admin</span>';
        }

        // Passamos o ehAdmin entre aspas simples ('${ehAdmin}') para evitar erro do HTML
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
            <td>${perfilExibicao}</td>
            <td>${user.legal_specialty || 'N/A'}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-action" title="Editar E-mail (Anti-Hacker)" onclick="editarUsuario('${user.id}', '${user.email}')">✏️</button>
                    <button class="btn-action" title="Resetar Senha" onclick="forçarResetSenha('${user.email}')">🔑</button>
                    <button class="btn-action" title="Suspender/Ativar" onclick="alternarStatus('${user.id}', '${ehAdmin}')">🚫</button>
                    <button class="btn-action" title="Ver Dados LGPD" onclick="verDetalhesLGPD('${user.id}')">📄</button>
                    <button class="btn-action" title="Ver Logs do Usuário" onclick="verLogsUsuario('${user.id}', '${user.full_name}')">📋</button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    atualizarControlesPaginacao();
}

function atualizarControlesPaginacao() {
    const totalItens = usuariosFiltradosGlobais.length;
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);

    const btnPrev = document.getElementById("btnPrevPage");
    const btnNext = document.getElementById("btnNextPage");
    const pageDisplay = document.getElementById("currentPageDisplay");
    const pageInfo = document.getElementById("paginationInfo");

    if (!btnPrev || !btnNext || !pageDisplay || !pageInfo) return;

    pageDisplay.textContent = paginaAtual;
    const inicioRender = totalItens === 0 ? 0 : ((paginaAtual - 1) * itensPorPagina) + 1;
    const fimRender = Math.min(paginaAtual * itensPorPagina, totalItens);
    pageInfo.textContent = `Mostrando ${inicioRender} a ${fimRender} de ${totalItens} usuários`;

    btnPrev.disabled = paginaAtual === 1;
    btnNext.disabled = paginaAtual === totalPaginas || totalPaginas === 0;
}

// =========================================================================
// 6. AÇÕES RÁPIDAS DOS BOTÕES DA TABELA
// =========================================================================

window.editarUsuario = async (id, emailAtual) => {
    const novoEmail = prompt(`ALTERAÇÃO DE EMERGÊNCIA:\nDigite o novo e-mail para substituir o atual (${emailAtual}):`, emailAtual);
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
                carregarTodosUsuarios(); 
            } else {
                alert("Erro: " + data.detail);
            }
        } catch (error) {
            alert("Erro de conexão com o servidor.");
        }
    }
};

window.forçarResetSenha = async (email) => {
    if(confirm(`Tem certeza que deseja enviar o e-mail de redefinição de senha para:\n${email}?`)) {
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
                alert("Sucesso! O usuário receberá um e-mail com o link seguro para alterar a senha.");
            } else {
                alert("Aviso: " + (data.detail || "Não foi possível enviar o e-mail."));
            }
        } catch (error) {
            alert("Erro de conexão ao tentar enviar o e-mail.");
        }
    }
};

// --- TRAVA MASTER DEFINITIVA ---
window.alternarStatus = async (id, isAdmin) => {
    // Agora verificamos se o HTML mandou a palavra 'true' em vez do valor boolean
    if (isAdmin === 'true' || isAdmin === true) {
        alert("Apenas o master tem permissão para realizar isso.");
        return; 
    }

    if(confirm("Tem certeza que deseja Suspender/Ativar esta conta?")) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/toggle-status/${id}`, {
                method: 'PATCH',
                headers: { "Authorization": `Bearer ${token}` }
            });
            if(response.ok) carregarTodosUsuarios(); 
        } catch (error) {
            alert("Erro ao tentar mudar o status da conta.");
        }
    }
};

window.verDetalhesLGPD = async (id) => {
    const modal = document.getElementById("lgpdModal");
    const content = document.getElementById("lgpdContent");
    
    content.innerText = "Buscando dados no servidor...";
    modal.style.display = "flex";

    try {
        const response = await fetch(`${API_BASE_URL}/admin/user-lgpd/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const dados = await response.json();
            content.innerText = JSON.stringify(dados, null, 4);
        } else {
            content.innerText = "Erro ao puxar ficha da LGPD do banco de dados.";
            content.style.color = "var(--error)";
        }
    } catch (error) {
        content.innerText = "Erro de conexão com o servidor.";
        content.style.color = "var(--error)";
    }
};

window.fecharModalLGPD = () => {
    document.getElementById("lgpdModal").style.display = "none";
};

window.verLogsUsuario = async (id, nome) => {
    const modal = document.getElementById("logsModal");
    const logsList = document.getElementById("logsList");
    
    const nomeExibicao = nome !== 'null' && nome ? nome : 'Usuário';
    document.getElementById("logsModalTitle").innerText = `Histórico de: ${nomeExibicao}`;
    
    logsList.innerHTML = "<li style='padding: 10px 0;'>Buscando histórico...</li>";
    modal.style.display = "flex";

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/logs`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const logs = await response.json();
            logsList.innerHTML = ""; 
            
            if (logs.length === 0) {
                logsList.innerHTML = "<li style='padding: 10px 0; text-align: center;'>Nenhum registro encontrado para este usuário.</li>";
            } else {
                logs.forEach(log => {
                    const dataFormatada = new Date(log.timestamp).toLocaleString("pt-BR");
                    logsList.innerHTML += `
                        <li style="padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="color: var(--primary-gold); font-weight: 600;">[${dataFormatada}]</span> 
                            ${log.action}
                        </li>`;
                });
            }
        } else {
            logsList.innerHTML = "<li style='color: var(--error); padding: 10px 0;'>Erro ao carregar o histórico.</li>";
        }
    } catch (error) {
        logsList.innerHTML = "<li style='color: var(--error); padding: 10px 0;'>Sem conexão com o servidor.</li>";
    }
};

window.fecharModalLogs = () => {
    document.getElementById("logsModal").style.display = "none";
};