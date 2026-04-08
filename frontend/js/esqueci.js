// js/esqueci.js

function irPara2FA() {
    const emailInput = document.getElementById('emailRecuperacao');
    const email = emailInput.value.trim();

    // Validação simples de preenchimento
    if (!email) {
        alert("Mano, insira seu e-mail para prosseguir!");
        emailInput.focus();
        return;
    }

    // Validação básica de formato de e-mail (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Esse e-mail não parece certo. Verifique se digitou corretamente.");
        return;
    }

    // Passa o e-mail para a próxima tela via URL
    // encodeURIComponent garante que símbolos como '@' não quebrem a URL
    window.location.href = `recuperar-2fa.html?email=${encodeURIComponent(email)}`;
}

// Atalho: apertar Enter no teclado também dispara o botão
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        irPara2FA();
    }
});