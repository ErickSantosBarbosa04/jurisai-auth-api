(function () {
    const token = localStorage.getItem("access_token");
    
    // Se a página não for a página de login, e o usuário não estiver logado, bloqueia o acesso
    const currentPath = window.location.pathname;
    
    // Se não houver token e não estivermos na página de login, redireciona
    if (!token && !currentPath.includes("login.html") && !currentPath.includes("register.html") && !currentPath.includes("esqueci.html")) {
        window.location.href = "login.html?motivo=acesso_negado";
    }
})();