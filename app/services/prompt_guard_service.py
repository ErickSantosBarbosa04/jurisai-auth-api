import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class PromptGuardDecision:
    allowed: bool
    code: str
    message: str = ""
    cleaned_text: str = ""


class PromptGuardService:
    """Guarda de escopo para manter o JurisAI dentro do dominio juridico."""

    OUT_OF_SCOPE_MESSAGE = (
        "Nao posso responder a isso. Sou focada apenas no juridico do JurisAI: "
        "Direito brasileiro, estudo academico, debate e pratica juridica."
    )
    PROMPT_INJECTION_MESSAGE = (
        "Nao posso seguir instrucoes que tentem alterar minhas regras, revelar prompts "
        "ou tirar o JurisAI do escopo. Sou focada apenas no juridico do JurisAI: "
        "Direito brasileiro, estudo academico, debate e pratica juridica."
    )
    DISCLAIMER = (
        "Protecao ativa: o JurisAI so responde dentro do escopo juridico academico."
    )

    LEGAL_TERMS = {
        "advogado",
        "administrativo",
        "alimentos",
        "ambiental",
        "apelacao",
        "artigo",
        "audiencia",
        "beneficio",
        "civil",
        "clt",
        "constituicao",
        "constitucional",
        "consumidor",
        "cdc",
        "contrato",
        "contratual",
        "crime",
        "criminal",
        "ctn",
        "culpa",
        "dano",
        "defesa",
        "defeito",
        "demissao",
        "demitido",
        "direito",
        "digital",
        "dolo",
        "emprego",
        "familia",
        "fornecedor",
        "guarda",
        "habeas",
        "indenizacao",
        "inicial",
        "juridica",
        "juridico",
        "jurisprudencia",
        "juiz",
        "juizado",
        "lei",
        "lgpd",
        "licitacao",
        "moral",
        "norma",
        "penal",
        "peticao",
        "previdenciario",
        "processar",
        "processo",
        "prova",
        "recurso",
        "relacao",
        "rescisao",
        "responsabilidade",
        "sentenca",
        "tese",
        "trabalhista",
        "trabalho",
        "tributario",
        "troca",
        "vicio",
    }

    LAY_LEGAL_PATTERNS = (
        r"\b(comprei|comprou|compra|produto|celular|notebook|loja|vendedor|empresa|fabricante)\b.{0,120}\b(defeito|defeituoso|defeituosa|estragado|estragada|quebrado|quebrada|bateria|troca|trocar|devolver|devolucao|reembolso|garantia|dinheiro|cancelar|cancelamento)\b",
        r"\b(defeito|defeituoso|defeituosa|estragado|estragada|quebrado|quebrada|bateria|troca|trocar|devolver|devolucao|reembolso|garantia|dinheiro|cancelar|cancelamento)\b.{0,120}\b(comprei|comprou|compra|produto|celular|notebook|loja|vendedor|empresa|fabricante)\b",
        r"\b(patrao|empresa|trabalho|emprego|demitido|demitida|salario|ferias|hora extra|carteira assinada)\b.{0,120}\b(deve|pagar|pagou|mandou embora|demissao|rescisao|direito)\b",
        r"\b(filho|filha|crianca|guarda|pensao|alimentos|ex marido|ex esposa)\b.{0,120}\b(deve|pagar|visita|mora|direito|obrigado|obrigada)\b",
        r"\b(aluguel|inquilino|proprietario|imovel|casa|apartamento)\b.{0,120}\b(despejo|caucao|multa|contrato|devolver|reparar|direito)\b",
        r"\b(multado|multa|prefeitura|servidor|concurso|licitacao|orgao publico)\b.{0,120}\b(recurso|anular|defesa|prazo|direito)\b",
    )

    RAG_HINT_PATTERNS = (
        (
            r"\b(comprei|comprou|compra|produto|celular|notebook|loja|vendedor|fabricante|garantia|reembolso|devolver|devolucao|troca|defeito|estragado|estragada|quebrado|quebrada|bateria)\b",
            "Direito do Consumidor CDC vicio do produto fornecedor responsabilidade solidaria garantia troca devolucao restituicao",
        ),
        (
            r"\b(patrao|empresa|trabalho|emprego|demitido|demitida|salario|ferias|hora extra|carteira assinada|rescisao)\b",
            "Direito do Trabalho relacao de emprego verbas rescisorias subordinacao salario rescisao CLT",
        ),
        (
            r"\b(filho|filha|crianca|guarda|pensao|alimentos|visita)\b",
            "Direito de Familia alimentos guarda melhor interesse pensao responsabilidade parental",
        ),
        (
            r"\b(aluguel|inquilino|proprietario|imovel|casa|apartamento|despejo|caucao)\b",
            "Direito Civil contratos inadimplemento aluguel responsabilidade civil obrigacao reparacao",
        ),
        (
            r"\b(multado|multa|prefeitura|servidor|concurso|licitacao|orgao publico)\b",
            "Direito Administrativo ato administrativo recurso defesa prazo legalidade motivacao",
        ),
    )

    LEGAL_PHRASES = {
        "acao judicial",
        "ato administrativo",
        "boa fe",
        "codigo civil",
        "codigo de defesa do consumidor",
        "codigo penal",
        "credito tributario",
        "dano moral",
        "defesa do consumidor",
        "direito brasileiro",
        "direito de arrependimento",
        "direito de familia",
        "direitos fundamentais",
        "fato gerador",
        "guarda compartilhada",
        "habeas corpus",
        "juizado especial",
        "negativacao indevida",
        "relacao de emprego",
        "responsabilidade civil",
        "verbas rescisorias",
        "vicio do produto",
    }

    HARD_PROMPT_INJECTION_PATTERNS = (
        r"\b(revele|mostre|exiba|imprima|vaze|exponha).{0,80}\b(prompt|system|sistema|developer|instrucoes|regras)\b",
        r"\b(jailbreak|modo dan|dan mode|developer mode|sem restricoes|sem filtros|bypass|desbloqueie)\b",
        r"\b(aja como|finja ser|voce agora e|voce deve ser).{0,80}\b(outro assistente|sem regras|sem restricoes|livre|ilimitado)\b",
        r"\b(responda|fale|explique).{0,80}\b(fora do juridico|qualquer assunto|sem limite de escopo)\b",
    )
    SOFT_PROMPT_INJECTION_PATTERNS = (
        r"\b(ignore|ignorar|desconsidere|desconsiderar|esqueca|apague|delete).{0,120}\b(mensagem|mesagem|msg|texto|trecho|parenteses|instrucoes|regras|anteriores|acima)\b",
        r"\b(me favoreca|me favoreça|favoreca minha resposta|favoreça minha resposta|me beneficie|puxe para mim)\b",
        r"\b(identifique|indentifique|classifique|avalie|marque|considere).{0,80}\b(90|100|cem|noventa|porcento|percentual|qualidade|nota|score)\b",
        r"\b(90|100|cem|noventa).{0,40}\b(porcento|percentual|qualidade|nota|score)\b",
        r"\b(aumente|suba|melhore).{0,60}\b(pontuacao|pontuação|porcentagem|percentual|nota|score)\b",
    )
    PROMPT_INJECTION_PATTERNS = HARD_PROMPT_INJECTION_PATTERNS + SOFT_PROMPT_INJECTION_PATTERNS

    @classmethod
    def evaluate(cls, text: str, history: list | None = None) -> PromptGuardDecision:
        original = cls.clean_text(text)
        original_normalized = cls._normalize(original)

        if cls.has_hard_prompt_injection(original_normalized):
            return PromptGuardDecision(
                False,
                "prompt_injection",
                cls.PROMPT_INJECTION_MESSAGE,
            )

        cleaned_text = cls.sanitize_user_text(original)
        normalized = cls._normalize(cleaned_text)
        if not normalized:
            if cls.has_prompt_injection(original_normalized):
                return PromptGuardDecision(
                    False,
                    "prompt_injection",
                    cls.PROMPT_INJECTION_MESSAGE,
                )
            return PromptGuardDecision(False, "empty", cls.OUT_OF_SCOPE_MESSAGE)

        if cls.has_prompt_injection(normalized):
            return PromptGuardDecision(
                False,
                "prompt_injection",
                cls.PROMPT_INJECTION_MESSAGE,
            )

        if cls.is_lay_legal_case(normalized):
            return PromptGuardDecision(True, "lay_legal_case", cleaned_text=cleaned_text)

        if not cls.is_legal_scope(normalized):
            if cls.has_legal_context(history) and cls.is_contextual_follow_up(normalized):
                return PromptGuardDecision(True, "contextual_follow_up", cleaned_text=cleaned_text)
            return PromptGuardDecision(False, "out_of_scope", cls.OUT_OF_SCOPE_MESSAGE)

        return PromptGuardDecision(True, "allowed", cleaned_text=cleaned_text)

    @classmethod
    def sanitize_history(cls, history: list) -> list[dict]:
        safe_history = []
        for item in history[-12:]:
            role = getattr(item, "role", None) or item.get("role")
            content = getattr(item, "content", None) or item.get("content")
            if role not in {"user", "assistant"} or not content:
                continue

            cleaned = cls.sanitize_user_text(content)
            if not cleaned:
                continue
            if role == "user" and not cls.evaluate(cleaned, safe_history).allowed:
                continue

            safe_history.append({"role": role, "content": cleaned[:3000]})
        return safe_history

    @classmethod
    def has_legal_context(cls, history: list | None) -> bool:
        if not history:
            return False

        for item in history[-8:]:
            content = getattr(item, "content", None) or item.get("content")
            if content and cls.has_legal_signal(cls._normalize(content)):
                return True
        return False

    @classmethod
    def is_contextual_follow_up(cls, normalized_text: str) -> bool:
        if cls.has_explicit_off_topic(normalized_text):
            return False

        tokens = re.findall(r"[a-z0-9]{2,}", normalized_text)
        if len(tokens) <= 12:
            return True

        follow_up_markers = {
            "acho",
            "aconteceu",
            "comprei",
            "data",
            "desde",
            "dia",
            "disse",
            "entao",
            "foi",
            "isso",
            "loja",
            "mas",
            "nao",
            "pedi",
            "porque",
            "pois",
            "quero",
            "quis",
            "recebi",
            "sim",
            "tenho",
        }
        if set(tokens).intersection(follow_up_markers):
            return True

        return bool(re.search(r"\b\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?\b", normalized_text))

    @staticmethod
    def has_explicit_off_topic(normalized_text: str) -> bool:
        off_topic_patterns = (
            r"\b(receita|miojo|bolo|comida|cozinhar|culinaria)\b",
            r"\b(futebol|filme|serie|anime|musica|jogo|videogame)\b",
            r"\b(remedio|diagnostico medico|treino de academia|dieta)\b",
            r"\b(python|javascript|html|css|programacao|codigo fonte)\b",
            r"\b(criptomoeda|bitcoin|investimento|aposta)\b",
            r"\bqual e a capital\b",
            r"\bqual a capital\b",
        )
        return any(re.search(pattern, normalized_text) for pattern in off_topic_patterns)

    @classmethod
    def build_contextual_query(cls, question: str, history: list) -> str:
        parts = []
        for item in history[-6:]:
            content = getattr(item, "content", None) or item.get("content")
            if content:
                parts.append(cls.clean_text(content)[:800])
        parts.append(cls.clean_text(question))
        return "\n".join(parts)

    @classmethod
    def build_rag_query(cls, question: str, history: list | None = None) -> str:
        base = cls.sanitize_user_text(question)
        normalized = cls._normalize(base)
        hints = [
            hint
            for pattern, hint in cls.RAG_HINT_PATTERNS
            if re.search(pattern, normalized)
        ]

        if not hints:
            return base

        return f"{base}\n{' '.join(hints)}"

    @classmethod
    def has_legal_signal(cls, normalized_text: str) -> bool:
        return cls.is_legal_scope(normalized_text) or cls.is_lay_legal_case(normalized_text)

    @classmethod
    def is_legal_scope(cls, normalized_text: str) -> bool:
        if any(phrase in normalized_text for phrase in cls.LEGAL_PHRASES):
            return True

        tokens = set(re.findall(r"[a-z0-9]{3,}", normalized_text))
        return bool(tokens.intersection(cls.LEGAL_TERMS))

    @classmethod
    def is_lay_legal_case(cls, normalized_text: str) -> bool:
        if cls.has_explicit_off_topic(normalized_text):
            return False
        return any(re.search(pattern, normalized_text) for pattern in cls.LAY_LEGAL_PATTERNS)

    @classmethod
    def has_prompt_injection(cls, normalized_text: str) -> bool:
        return any(
            re.search(pattern, normalized_text)
            for pattern in cls.PROMPT_INJECTION_PATTERNS
        )

    @classmethod
    def has_hard_prompt_injection(cls, normalized_text: str) -> bool:
        return any(
            re.search(pattern, normalized_text)
            for pattern in cls.HARD_PROMPT_INJECTION_PATTERNS
        )

    @classmethod
    def has_soft_prompt_injection(cls, normalized_text: str) -> bool:
        return any(
            re.search(pattern, normalized_text)
            for pattern in cls.SOFT_PROMPT_INJECTION_PATTERNS
        )

    @classmethod
    def sanitize_user_text(cls, text: str) -> str:
        cleaned = cls.clean_text(text)
        if not cleaned:
            return ""

        cleaned = cls._remove_marked_soft_injections(cleaned)
        kept_parts = []
        for part in cls._split_into_safety_parts(cleaned):
            normalized = cls._normalize(part)
            if cls.has_soft_prompt_injection(normalized) or cls.has_hard_prompt_injection(normalized):
                continue
            kept_parts.append(part.strip())

        return cls.clean_text(" ".join(kept_parts))

    @classmethod
    def _remove_marked_soft_injections(cls, text: str) -> str:
        marked_patterns = (
            r"\*[^*\n]{0,260}\*",
            r"\([^()\n]{0,260}\)",
            r"\[[^\[\]\n]{0,260}\]",
            r"\{[^{}\n]{0,260}\}",
        )
        cleaned = text
        for pattern in marked_patterns:
            cleaned = re.sub(
                pattern,
                lambda match: "" if cls.has_soft_prompt_injection(cls._normalize(match.group(0))) else match.group(0),
                cleaned,
            )
        return cleaned

    @staticmethod
    def _split_into_safety_parts(text: str) -> list[str]:
        parts = re.split(r"(?<=[.!?])\s+|\n+", text)
        return [part.strip() for part in parts if part.strip()]

    @staticmethod
    def clean_text(text: str) -> str:
        text = str(text or "").strip()
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]+", " ", text)
        return re.sub(r"\s+", " ", text)

    @staticmethod
    def _normalize(text: str) -> str:
        normalized = unicodedata.normalize("NFKD", str(text or "").lower())
        normalized = "".join(
            char for char in normalized if not unicodedata.combining(char)
        )
        return re.sub(r"\s+", " ", normalized).strip()
