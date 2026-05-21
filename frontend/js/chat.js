const API_BASE_URL = window.location.origin;
const token = localStorage.getItem("access_token");
const messagesEl = document.getElementById("messages");
const sourcesList = document.getElementById("sourcesList");
const questionInput = document.getElementById("questionInput");
const chatForm = document.getElementById("chatForm");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const speakBtn = document.getElementById("speakBtn");
const voiceStatus = document.getElementById("voiceStatus");
const providerBadge = document.getElementById("providerBadge");
const logoutBtn = document.getElementById("logoutBtn");
const modeButtons = document.querySelectorAll("[data-mode]");
const debateScoreCard = document.getElementById("debateScoreCard");
const debateScorePercent = document.getElementById("debateScorePercent");
const debateScoreBar = document.getElementById("debateScoreBar");
const debateScoreText = document.getElementById("debateScoreText");

let currentMode = new URLSearchParams(window.location.search).get("mode") || "debate";
let isAwaitingAi = false;
let typingIndicatorEl = null;
let previousProviderLabel = "IA local";
const MIN_AI_WORKING_MS = 450;

const introMessages = {
    debate: "Traga um caso e defenda uma tese inicial. Eu vou provocar, apresentar contraponto e pedir sua resposta.",
    estudo: "Digite um tema juridico. Eu explico com fontes e fecho com uma pergunta de revisao.",
    peticao: "Descreva o caso. Eu ajudo a construir a peca por blocos, sem entregar tudo pronto."
};

const chatState = {
    debate: { messages: [], history: [], sources: [], lastAnswer: "", debateScore: null, providerLabel: "IA local" },
    estudo: { messages: [], history: [], sources: [], lastAnswer: "", debateScore: null, providerLabel: "IA local" },
    peticao: { messages: [], history: [], sources: [], lastAnswer: "", debateScore: null, providerLabel: "IA local" }
};

const modeUi = {
    debate: {
        placeholder: "Apresente um caso e defenda uma tese inicial. Ex: Acho que o caso e vicio do produto, porque...",
        button: "Debater com a IA",
        status: "Modo Debate: este chat tem historico proprio e calcula chance academica de exito."
    },
    estudo: {
        placeholder: "Digite o tema que quer estudar. Ex: diferenca entre vicio do produto e direito de arrependimento.",
        button: "Estudar com a IA",
        status: "Modo Estudo: este chat fica separado do Debate e da Peticao."
    },
    peticao: {
        placeholder: "Descreva o caso e tente indicar a peca. Ex: quero montar uma inicial contra loja por produto defeituoso.",
        button: "Construir peca",
        status: "Modo Peticao: este chat guarda a construcao da sua peca por etapas."
    }
};

if (localStorage.getItem("theme_mode") === "dark") {
    document.body.classList.add("dark-mode");
}

if (!token) {
    window.location.href = "login.html?motivo=acesso_negado";
}

function ensureMode(mode) {
    return chatState[mode] ? mode : "debate";
}

function setActiveMode(mode) {
    if (isAwaitingAi) {
        voiceStatus.textContent = "Aguarde a resposta atual antes de trocar de modo.";
        return;
    }

    currentMode = ensureMode(mode);
    modeButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.mode === currentMode);
    });

    const ui = modeUi[currentMode];
    questionInput.placeholder = ui.placeholder;
    sendBtn.textContent = ui.button;
    voiceStatus.textContent = ui.status;
    renderCurrentMode();
}

function renderCurrentMode() {
    const state = chatState[currentMode];
    messagesEl.innerHTML = "";

    if (state.messages.length === 0) {
        addMessageToDom("assistant", introMessages[currentMode]);
    } else {
        state.messages.forEach((message) => addMessageToDom(message.role, message.content));
    }

    renderSources(state.sources);
    renderDebateScore(state.debateScore);
    providerBadge.textContent = state.providerLabel || "IA local";
}

function addMessageToDom(role, text) {
    const article = document.createElement("article");
    article.className = `message ${role}`;

    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = role === "user" ? "Estudante" : "JurisAI";

    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    article.appendChild(label);
    article.appendChild(paragraph);
    messagesEl.appendChild(article);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(role, text, mode = currentMode) {
    chatState[mode].messages.push({ role, content: text });

    if (mode === currentMode) {
        addMessageToDom(role, text);
    }
}

function showAiWorkingIndicator(mode) {
    if (mode !== currentMode) {
        return;
    }

    removeAiWorkingIndicator();

    typingIndicatorEl = document.createElement("article");
    typingIndicatorEl.className = "message assistant ai-working";
    typingIndicatorEl.setAttribute("aria-live", "polite");

    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = "JurisAI";

    const row = document.createElement("div");
    row.className = "working-row";

    const text = document.createElement("span");
    text.textContent = "JurisAI esta pensando";

    const dots = document.createElement("span");
    dots.className = "typing-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = "<span></span><span></span><span></span>";

    row.appendChild(text);
    row.appendChild(dots);
    typingIndicatorEl.appendChild(label);
    typingIndicatorEl.appendChild(row);
    messagesEl.appendChild(typingIndicatorEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeAiWorkingIndicator() {
    if (typingIndicatorEl) {
        typingIndicatorEl.remove();
        typingIndicatorEl = null;
    }
}

function setAwaitingAi(isAwaiting, mode = currentMode) {
    isAwaitingAi = isAwaiting;
    sendBtn.disabled = isAwaiting;
    questionInput.disabled = isAwaiting;
    voiceBtn.disabled = isAwaiting;
    speakBtn.disabled = isAwaiting;
    modeButtons.forEach((button) => {
        button.disabled = isAwaiting;
    });

    if (isAwaiting) {
        previousProviderLabel = providerBadge.textContent;
        sendBtn.textContent = "Pensando...";
        providerBadge.textContent = "JurisAI esta pensando";
        voiceStatus.textContent = "JurisAI esta pensando e validando o escopo juridico.";
        showAiWorkingIndicator(mode);
        return;
    }

    removeAiWorkingIndicator();
    sendBtn.textContent = modeUi[currentMode].button;
    providerBadge.textContent = chatState[currentMode].providerLabel || previousProviderLabel || "IA local";
}

function waitForVisibleWorkState(startedAt) {
    const elapsed = Date.now() - startedAt;
    const remaining = MIN_AI_WORKING_MS - elapsed;
    if (remaining <= 0) {
        return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, remaining));
}

function renderSources(sources) {
    sourcesList.innerHTML = "";

    if (!sources || sources.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "As fontes deste chat aparecem aqui depois da primeira pergunta.";
        sourcesList.appendChild(empty);
        return;
    }

    sources.forEach((source) => {
        const item = document.createElement("article");
        item.className = "source-item";

        const title = document.createElement("strong");
        title.textContent = source.title;

        const file = document.createElement("span");
        file.textContent = source.file;

        const excerpt = document.createElement("p");
        excerpt.textContent = source.excerpt;

        item.appendChild(title);
        item.appendChild(file);
        item.appendChild(excerpt);
        sourcesList.appendChild(item);
    });
}

function renderDebateScore(score) {
    const isDebate = currentMode === "debate";
    debateScoreCard.classList.toggle("hidden", !isDebate);

    if (!isDebate) {
        return;
    }

    if (!score) {
        debateScorePercent.textContent = "--%";
        debateScoreBar.style.width = "0%";
        debateScoreText.textContent = "Envie uma tese no modo Debate para calcular a forca argumentativa.";
        return;
    }

    debateScorePercent.textContent = `${score.percent}%`;
    debateScoreBar.style.width = `${score.percent}%`;
    debateScoreText.textContent = `${score.label}. ${score.reason}`;
}

async function sendQuestion(event) {
    event.preventDefault();
    const question = questionInput.value.trim();
    const modeAtSend = currentMode;
    const state = chatState[modeAtSend];

    if (!question) {
        voiceStatus.textContent = "Digite ou fale um caso antes de enviar.";
        return;
    }

    addMessage("user", question, modeAtSend);
    state.history.push({ role: "user", content: question });
    questionInput.value = "";
    setAwaitingAi(true, modeAtSend);
    const requestStartedAt = Date.now();

    try {
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                question,
                mode: modeAtSend,
                history: state.history.slice(-10)
            })
        });

        if (response.status === 401) {
            localStorage.removeItem("access_token");
            window.location.href = "login.html?motivo=inatividade";
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Nao foi possivel consultar o JurisAI.");
        }

        state.lastAnswer = data.answer;
        state.sources = data.sources || [];
        state.debateScore = data.debate_score || null;
        state.providerLabel = `${data.provider} / ${data.model}`;
        await waitForVisibleWorkState(requestStartedAt);
        removeAiWorkingIndicator();
        addMessage("assistant", data.answer, modeAtSend);
        state.history.push({ role: "assistant", content: data.answer });

        if (modeAtSend === currentMode) {
            providerBadge.textContent = state.providerLabel;
            renderSources(state.sources);
            renderDebateScore(state.debateScore);
            voiceStatus.textContent = data.disclaimer || "Resposta pronta.";
        }
    } catch (error) {
        await waitForVisibleWorkState(requestStartedAt);
        removeAiWorkingIndicator();
        addMessage("assistant", `Nao consegui responder agora. Detalhe: ${error.message}`, modeAtSend);
    } finally {
        setAwaitingAi(false, modeAtSend);
    }
}

function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceStatus.textContent = "Seu navegador nao liberou reconhecimento de voz.";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        voiceBtn.disabled = true;
        voiceStatus.textContent = "Ouvindo... fale o caso juridico.";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        questionInput.value = questionInput.value
            ? `${questionInput.value.trim()} ${transcript}`
            : transcript;
        voiceStatus.textContent = "Texto capturado. Revise e envie.";
    };

    recognition.onerror = () => {
        voiceStatus.textContent = "Nao foi possivel captar a voz. Tente novamente ou digite.";
    };

    recognition.onend = () => {
        voiceBtn.disabled = false;
    };

    recognition.start();
}

function speakLastAnswer() {
    const lastAnswer = chatState[currentMode].lastAnswer;
    if (!lastAnswer) {
        voiceStatus.textContent = "Ainda nao ha resposta da IA neste chat para ler.";
        return;
    }

    if (!window.speechSynthesis) {
        voiceStatus.textContent = "Seu navegador nao suporta leitura por voz.";
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastAnswer);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}

modeButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveMode(button.dataset.mode));
});

chatForm.addEventListener("submit", sendQuestion);
voiceBtn.addEventListener("click", startVoiceInput);
speakBtn.addEventListener("click", speakLastAnswer);

logoutBtn.addEventListener("click", async () => {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
    } finally {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
});

setActiveMode(currentMode);
